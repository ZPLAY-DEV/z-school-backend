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
import { THIRTY_DAYS } from 'src/common/constants';
import { Role } from 'src/common/enums';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';
import { UserDto } from 'src/domain/auth/dto/user.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { Token } from 'src/domain/user/entities/token.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, MoreThan, Repository } from 'typeorm';
import * as uuid from 'uuid';
import { AuthUserDto } from './dto/auth-user.dto';

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
  private readonly environment: string;
  private readonly appUrl: string;

  private readonly userRepository: Repository<User>;
  private readonly instructorRepository: Repository<Instructor>;
  private readonly parentRepository: Repository<Parent>;
  private readonly managerRepository: Repository<Manager>;
  private readonly tokenRepository: Repository<Token>;
  private readonly shortlinkRepository: Repository<Shortlink>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly slack: SlackService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get<string>('nodeEnv', 'development');
    this.appUrl = this.configService.get<string>(
      'appUrl',
      'http://localhost:3000',
    );

    this.userRepository = this.dataSource.getRepository(User);
    this.instructorRepository = this.dataSource.getRepository(Instructor);
    this.parentRepository = this.dataSource.getRepository(Parent);
    this.managerRepository = this.dataSource.getRepository(Manager);
    this.tokenRepository = this.dataSource.getRepository(Token);
    this.shortlinkRepository = this.dataSource.getRepository(Shortlink);
  }

  /**
   * Validates user credentials against the database
   * Used by passport local strategy and login method
   */
  async validateUser(dto: UserCredentialsDto): Promise<User> {
    const { username, password, role } = dto;

    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['instructor', 'parent', 'manager'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hasRole = this.checkUserHasRole(user, role);
    if (!hasRole) {
      throw new UnauthorizedException('Invalid role');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateUserWithNanoid(id: string): Promise<User> {
    const shortlink = await this.shortlinkRepository.findOneOrFail({
      where: { nanoid: id },
      relations: ['parent', 'parent.user'],
    });

    const user: User =
      shortlink.parent?.user ||
      ({
        username: 'unknown',
        phone: shortlink.parent?.phone,
        email: null,
        avatar: 'https://placehold.co/100x100',
      } as User);

    return { ...user, parent: shortlink.parent };
  }

  /**
   * Register a parent or instructor user with phone number
   */
  async register(dto: UserCredentialsDtoWithPhone): Promise<AuthUserDto> {
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

      // 💥 fire and forget) Send Slack notification
      this.sendRegistrationSlack(updatedUser, dto.role).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // Return response
      return {
        user: plainToClass(UserDto, updatedUser, {
          excludeExtraneousValues: true,
        }),
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
  async registerManager(dto: UserCredentialsDto): Promise<AuthUserDto> {
    try {
      // Validate manager role
      if (dto.role !== Role.MANAGER) {
        throw new BadRequestException('Invalid role');
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

      // 💥 fire and forget) Send Slack notification
      this.sendRegistrationSlack(updatedUser, dto.role).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // Return response
      return {
        user: plainToClass(UserDto, updatedUser, {
          excludeExtraneousValues: true,
        }),
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
      throw new BadRequestException('Internal database error');
    }
  }

  /**
   * Log in a user and generate auth tokens
   */
  async login(dto: UserCredentialsDto): Promise<AuthUserDto> {
    const user = await this.validateUser(dto);
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      dto.role,
    );
    return {
      user: plainToClass(UserDto, user, { excludeExtraneousValues: true }),
      role: dto.role,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Log in a user and generate auth tokens
   */
  async loginWithNanoid(nanoid: string): Promise<AuthUserDto> {
    const user = await this.validateUserWithNanoid(nanoid);

    console.log(user);

    const { accessToken, refreshToken } = await this.generateTokensWithNanoid(
      user,
      Role.PARENT,
    );
    return {
      user: plainToClass(UserDto, user, { excludeExtraneousValues: true }),
      role: Role.PARENT,
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
      const partialToken = `${refreshToken}-L`;
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
  ): Promise<AuthTokenDto> {
    const tokenRecord = await this.tokenRepository.findOne({
      where: {
        userId,
        role,
        partialToken: `${refreshToken}-L`,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.instructor', 'user.parent', 'user.manager'],
    });

    if (
      !tokenRecord ||
      !(await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = tokenRecord.user;
    const hasRole = this.checkUserHasRole(user, role);
    if (!hasRole) {
      throw new UnauthorizedException('Access denied');
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
      throw new NotFoundException('Phone not found');
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
      throw new NotFoundException('User not found');
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
      relations: ['instructor', 'parent', 'manager'],
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (user) {
      // Check if already registered with this role
      if (
        (dto.role === Role.INSTRUCTOR && user.instructor) ||
        (dto.role === Role.PARENT && user.parent)
      ) {
        throw new ConflictException('already registered');
      }

      // Update password
      await this.userRepository.update(user.id, { password: hashedPassword });

      // Return refreshed user data
      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['instructor', 'parent', 'manager'],
      });

      if (!updatedUser) {
        throw new BadRequestException('Internal database error');
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
      relations: ['instructor', 'parent', 'manager'],
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (user) {
      if (user.manager) {
        throw new ConflictException('Already registered');
      }

      // Update password
      await this.userRepository.update(user.id, { password: hashedPassword });

      // Return refreshed user data
      const updatedUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['instructor', 'parent', 'manager'],
      });

      if (!updatedUser) {
        throw new BadRequestException('Internal database error');
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
      await this.instructorRepository.upsert(instructor, ['phone']);
    } else if (dto.role === Role.PARENT) {
      const parent = new Parent({
        userId: user.id,
        phone: dto.phone,
      });
      await this.parentRepository.upsert(parent, ['phone']);
    } else {
      throw new BadRequestException('Invalid role');
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
      relations: ['instructor', 'parent', 'manager'],
    });

    if (!user) {
      throw new BadRequestException('Internal database error');
    }

    return user;
  }

  /**
   * Generate an access token
   */
  private async generateAccessToken(payload: TokenPayload): Promise<string> {
    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: '1h', //? ONE_HOUR,
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

    // Check for existing tokens first
    const tokens = await this.tokenRepository.find({
      where: {
        userId: user.id,
        role,
      },
    });

    let refreshToken: string;
    if (tokens.length === 0) {
      // Generate new refresh token
      refreshToken = `Z-${user.id}-${role.charAt(0)}-${uuid.v4()}`;
      const partialToken = `${refreshToken}-L`;
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
    } else {
      // Reuse existing token (get the latest one)
      const latestToken = tokens.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt)
          ? current
          : latest;
      });
      refreshToken = latestToken.partialToken.slice(0, -2);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate both access and refresh tokens
   */
  private async generateTokensWithNanoid(
    user: User,
    role: Role,
  ): Promise<TokenData> {
    // Generate access token
    const payload = {
      sub: user.id,
      username: user.username,
      role,
    };

    const accessToken = await this.generateAccessToken(payload);
    const tokens = await this.tokenRepository.find({
      where: {
        userId: user.id,
        role,
      },
    });
    let refreshToken: string;
    if (tokens.length === 0) {
      // Generate refresh token
      refreshToken = `Z-${user.id}-${role.charAt(0)}-${uuid.v4()}`;
      const partialToken = `${refreshToken}-L`;
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
    } else {
      const latestToken = tokens.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt)
          ? current
          : latest;
      });
      refreshToken = latestToken.partialToken.slice(0, -2);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Send registration notification to Slack
   */
  private async sendRegistrationSlack(user: User, role: Role): Promise<void> {
    if (this.environment !== 'development') {
      const userId = user.id;
      const username = user.username ?? role;
      await this.slack.sendMessage({
        channel: 'activity',
        text: `[${this.environment}-api] 🥳 회원가입(credentials) : <${this.appUrl}/users/${userId}|${username}>`,
      });
    }
  }
}
