import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToClass } from 'class-transformer';
import { ONE_HOUR, THIRTY_DAYS } from 'src/common/constants';
import { Role } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { RefreshResponseDto } from 'src/domain/auth/dto/refresh-response.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Token } from 'src/domain/user/entities/token.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { SlackService } from 'src/services/slack/slack-service';
import { DataSource, MoreThan, Repository } from 'typeorm';
import * as uuid from 'uuid';
import { AuthResponseDto } from './dto/auth-response.dto';

type TokenPayload = {
  sub: number;
  username: string;
  role: Role;
};

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userRepository: Repository<User>;
  private readonly instructorRepository: Repository<Instructor>;
  private readonly parentRepository: Repository<Parent>;
  private readonly managerRepository: Repository<Manager>;
  private readonly tokenRepository: Repository<Token>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly slack: SlackService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.userRepository = this.dataSource.getRepository(User);
    this.instructorRepository = this.dataSource.getRepository(Instructor);
    this.parentRepository = this.dataSource.getRepository(Parent);
    this.managerRepository = this.dataSource.getRepository(Manager);
    this.tokenRepository = this.dataSource.getRepository(Token);
  }

  /**
   * Validates user credentials against the database
   * Used by passport local strategy and login method
   */
  async validateUser(dto: UserCredentialsDto): Promise<User> {
    const { username, password, role } = dto;

    const userRecord = await this.userRepository.findOne({
      where: { username },
      relations: ['tokens', 'instructor', 'parent', 'manager'],
    });

    if (!userRecord) {
      throw new UnauthorizedException(HttpErrorConstants.NOT_FOUND_USER);
    }

    const hasRole = this.checkUserHasRole(userRecord, role);
    if (!hasRole) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_ROLE);
    }

    const passwordMatches = await bcrypt.compare(password, userRecord.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_CREDENTIALS);
    }

    return userRecord;
  }

  /**
   * Register a parent or instructor user with phone number
   */
  async register(dto: UserCredentialsDtoWithPhone): Promise<AuthResponseDto> {
    try {
      // Check if user exists and create/update as needed
      const user = await this.findOrCreateUserWithPhone(dto);

      // Create role-specific entity
      await this.createRoleSpecificEntity(user, dto);

      // Reload user with updated relations
      const updatedUser = await this.reloadUserWithRelations(user.id);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(
        updatedUser,
        dto.role,
      );

      // Send notification (non-critical)
      this.sendRegistrationNotification(updatedUser, dto.role).catch(
        (error) => {
          this.logger.warn('Failed to send Slack notification', error);
        },
      );

      // Return response
      return {
        user: plainToClass(User, updatedUser),
        role: dto.role,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Registration error', error);
      throw error;
    }
  }

  /**
   * Register a manager (without phone number)
   */
  async registerManager(dto: UserCredentialsDto): Promise<AuthResponseDto> {
    try {
      // Validate manager role
      if (dto.role !== Role.MANAGER) {
        throw new BadRequestException(HttpErrorConstants.INVALID_ROLE);
      }

      // Check if user exists and create/update as needed
      const user = await this.findOrCreateManager(dto);

      // Create manager entity
      await this.createManagerEntity(user);

      // Reload user with updated relations
      const updatedUser = await this.reloadUserWithRelations(user.id);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(
        updatedUser,
        dto.role,
      );

      // Send notification (non-critical)
      this.sendRegistrationNotification(updatedUser, dto.role).catch(
        (error) => {
          this.logger.warn('Failed to send Slack notification', error);
        },
      );

      // Return response
      return {
        user: plainToClass(User, updatedUser),
        role: dto.role,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Manager registration error:`, error);

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error; // Pass through already formatted errors
      }

      // For any other errors, throw a generic database error
      throw new BadRequestException(HttpErrorConstants.INTERNAL_DATABASE_ERROR);
    }
  }

  /**
   * Log in a user and generate auth tokens
   */
  async login(dto: UserCredentialsDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto);
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      dto.role,
    );

    return {
      user: plainToClass(User, user),
      role: dto.role,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Log out a user by removing their refresh token(s)
   */
  async logout(
    userId: number,
    role: Role,
    refreshToken?: string | null,
  ): Promise<void> {
    if (refreshToken) {
      // Logout specific device
      const partialToken = refreshToken.slice(0, 36);
      const tokenRecord = await this.tokenRepository.findOne({
        where: { userId, role, partialToken },
      });

      if (
        tokenRecord &&
        (await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
      ) {
        await this.tokenRepository.delete(tokenRecord.id);
      }
    } else {
      // Logout all devices for this role
      await this.tokenRepository.delete({ userId, role });
    }
  }

  /**
   * Log out a user from all devices by deleting all refresh tokens
   */
  async logoutAll(userId: number): Promise<void> {
    await this.tokenRepository.delete({ userId });
  }

  /**
   * Refresh an access token using a valid refresh token
   */
  async refreshToken(
    userId: number,
    role: Role,
    refreshToken: string,
  ): Promise<RefreshResponseDto> {
    const tokenRecord = await this.tokenRepository.findOne({
      where: {
        userId,
        role,
        partialToken: refreshToken.slice(0, 36),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.instructor', 'user.parent', 'user.manager'],
    });

    if (
      !tokenRecord ||
      !(await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
    ) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_TOKEN);
    }

    const user = tokenRecord.user;
    const hasRole = this.checkUserHasRole(user, role);
    if (!hasRole) {
      throw new UnauthorizedException(HttpErrorConstants.ACCESS_DENIED);
    }

    const accessToken = await this.generateAccessToken({
      sub: user.id,
      username: user.username,
      role,
    });

    return { accessToken };
  }

  /**
   * Reset a user's password
   */
  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_PHONE);
    }

    // OTP validation code commented out in original
    // const key = `${this.env}:user:${user.id}:otp`;
    // const value = await this.cacheManager.get(key);
    // if (!value) {
    //   throw new BadRequestException('otp expired');
    // } else if (value !== dto.code) {
    //   throw new BadRequestException('otp mismatched');
    // }

    const updatedUser = await this.userRepository.preload({
      id: user.id,
      password: dto.password,
    });

    if (!updatedUser) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_USER);
    }

    return await this.userRepository.save(updatedUser);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Helpers
  //? ---------------------------------------------------------------------- ?//

  /**
   * Check if a user has the specified role
   */
  private checkUserHasRole(user: User, role: Role): boolean {
    if (role === Role.INSTRUCTOR && user.instructor) return true;
    if (role === Role.PARENT && user.parent) return true;
    if (role === Role.MANAGER && user.manager) return true;
    return false;
  }

  /**
   * Find an existing user by phone or create a new one
   */
  private async findOrCreateUserWithPhone(
    dto: UserCredentialsDtoWithPhone,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone },
      relations: ['instructor', 'parent', 'tokens'],
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (user) {
      // Check if already registered with this role
      if (
        (dto.role === Role.INSTRUCTOR && user.instructor) ||
        (dto.role === Role.PARENT && user.parent)
      ) {
        throw new ConflictException(HttpErrorConstants.ALREADY_REGISTERED);
      }

      // Update password
      await this.userRepository.update(user.id, { password: hashedPassword });

      // Return refreshed user data
      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['instructor', 'parent', 'tokens'],
      });

      if (!updatedUser) {
        throw new BadRequestException(
          HttpErrorConstants.INTERNAL_DATABASE_ERROR,
        );
      }

      return updatedUser;
    } else {
      // Create new user
      const newUser = new User({
        username: dto.username,
        phone: dto.phone,
        password: hashedPassword,
      });

      return await this.userRepository.save(newUser);
    }
  }

  /**
   * Find an existing manager by username or create a new one
   */
  private async findOrCreateManager(dto: UserCredentialsDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
      relations: ['manager', 'tokens'],
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (user) {
      if (user.manager) {
        throw new ConflictException(HttpErrorConstants.ALREADY_REGISTERED);
      }

      // Update password
      await this.userRepository.update(user.id, { password: hashedPassword });

      // Return refreshed user data
      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['manager', 'tokens'],
      });

      if (!updatedUser) {
        throw new BadRequestException(
          HttpErrorConstants.INTERNAL_DATABASE_ERROR,
        );
      }

      return updatedUser;
    } else {
      // Create new user
      const newUser = new User({
        username: dto.username,
        password: hashedPassword,
      });

      return await this.userRepository.save(newUser);
    }
  }

  /**
   * Create role-specific entity for a user
   */
  private async createRoleSpecificEntity(
    user: User,
    dto: UserCredentialsDtoWithPhone,
  ): Promise<void> {
    if (dto.role === Role.INSTRUCTOR) {
      const instructor = new Instructor({
        userId: user.id,
        phone: dto.phone,
      });
      await this.instructorRepository.save(instructor);
    } else if (dto.role === Role.PARENT) {
      const parent = new Parent({
        userId: user.id,
        phone: dto.phone,
      });
      await this.parentRepository.save(parent);
    } else {
      throw new BadRequestException(HttpErrorConstants.INVALID_ROLE);
    }
  }

  /**
   * Create manager entity for a user
   */
  private async createManagerEntity(user: User): Promise<void> {
    const manager = new Manager({
      userId: user.id,
    });
    await this.managerRepository.save(manager);
  }

  /**
   * Reload a user with all relevant relations
   */
  private async reloadUserWithRelations(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['instructor', 'parent', 'manager', 'tokens'],
    });

    if (!user) {
      throw new BadRequestException(HttpErrorConstants.INTERNAL_DATABASE_ERROR);
    }

    return user;
  }

  /**
   * Generate an access token
   */
  private async generateAccessToken(payload: TokenPayload): Promise<string> {
    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: ONE_HOUR,
    };

    return this.jwtService.signAsync(payload, accessTokenOptions);
  }

  /**
   * Generate both access and refresh tokens
   */
  private async generateTokens(user: User, role: Role): Promise<TokenData> {
    // Generate access token
    const payload = {
      sub: user.id,
      username: user.username,
      role,
    };

    const accessToken = await this.generateAccessToken(payload);

    // Generate refresh token
    const refreshToken = `XYZ-${user.id}-${role.toLowerCase()}-${uuid.v4()}`;
    const partialToken = refreshToken.slice(0, 36);
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + THIRTY_DAYS);

    // Store token in database
    await this.tokenRepository.upsert(
      {
        userId: user.id,
        role,
        partialToken,
        hashedToken,
        expiresAt,
      },
      ['userId', 'role', 'partialToken'],
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Send registration notification to Slack
   */
  private async sendRegistrationNotification(
    user: User,
    role: Role,
  ): Promise<void> {
    const userId = user.id;
    const username = user.username ?? role;
    await this.slack.sendMessage({
      channel: 'activity',
      text: `[${process.env.NODE_ENV}-api] 🥳 회원가입(credentials) : <${process.env.APP_URL}/users/${userId}|${username}>`,
    });
  }
}
