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
import { DataSource, MoreThan } from 'typeorm';
import * as uuid from 'uuid';
import { AuthResponseDto } from './dto/auth-response.dto';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly slack: SlackService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Passport local strategy
  //? ---------------------------------------------------------------------- ?//

  // being used in auth/strategies/local.strategy
  async validateUser(dto: UserCredentialsDto): Promise<User> {
    const { username, password, role } = dto;

    const userRepository = this.dataSource.getRepository<User>('User');
    const userRecord = await userRepository.findOne({
      where: {
        username,
      },
      relations: ['tokens', 'instructor', 'parent', 'manager'],
    });

    if (!userRecord) {
      throw new UnauthorizedException(HttpErrorConstants.NOT_FOUND_USER);
    }

    let hasRole = false;
    if (role === Role.INSTRUCTOR && userRecord.instructor) hasRole = true;
    else if (role === Role.PARENT && userRecord.parent) hasRole = true;
    else if (role === Role.MANAGER && userRecord.manager) hasRole = true;
    if (!hasRole) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_ROLE);
    }
    const passwordMatches = await bcrypt.compare(password, userRecord.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_CREDENTIALS);
    }

    return userRecord;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 전화번호 있는 부모/강사 App용 회원가입
  //? ---------------------------------------------------------------------- ?//

  // phone 가입 w/ Credentials
  async register(dto: UserCredentialsDtoWithPhone): Promise<AuthResponseDto> {
    let user: User | null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      user = await queryRunner.manager.findOne(User, {
        where: { phone: dto.phone },
        relations: ['instructor', 'parent', 'tokens'],
      });

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      if (user) {
        if (
          (dto.role === Role.INSTRUCTOR && user.instructor) ||
          (dto.role === Role.PARENT && user.parent)
        ) {
          throw new ConflictException();
        }
        //! 부모회원 가입회원이 강사회원으로 가입시, 사용자 비밀번호가 업데이트가 된다.
        user.password = hashedPassword;
        await queryRunner.manager.save(User, user);
      } else {
        // 유저 새로 생성
        const newUser = queryRunner.manager.create(User, {
          username: dto.username,
          phone: dto.phone,
          password: hashedPassword,
          role: dto.role,
        });
        user = await queryRunner.manager.save(User, newUser);
      }

      // Role-specific entity 생성
      if (dto.role === Role.INSTRUCTOR) {
        await queryRunner.manager.save(
          dto.role === Role.INSTRUCTOR ? Instructor : Role.PARENT,
          {
            userId: user.id,
            phone: dto.phone,
          },
        );
      } else if (dto.role === Role.PARENT) {
        await queryRunner.manager.save(Parent, {
          userId: user.id,
          phone: dto.phone,
        });
      }

      await queryRunner.commitTransaction();
      const tokens = await this.login({
        username: dto.username,
        password: dto.password,
        role: dto.role,
      });

      await this.slack.sendMessage({
        text: `[${process.env.NODE_ENV}-api] 🥳 회원가입(credentials) : <${process.env.APP_URL}/users/${user.id}|${user.username ?? dto.role}>`,
      });

      return tokens;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(err);
      if (err instanceof ConflictException) {
        throw new BadRequestException(HttpErrorConstants.ALREADY_REGISTERED);
      }
      throw new BadRequestException(HttpErrorConstants.INTERNAL_DATABASE_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 전화번호 없는 매니저 가입
  //? ---------------------------------------------------------------------- ?//

  //! manager 는 username 과 password 만 필요 (phone 없음)
  async registerManager(dto: UserCredentialsDto): Promise<AuthResponseDto> {
    let user: User | null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      user = await queryRunner.manager.findOne(User, {
        where: { username: dto.username },
        relations: ['manager', 'tokens'],
      });

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      if (user) {
        throw new ConflictException();
      } else {
        // 유저 새로 생성
        const newUser = queryRunner.manager.create(User, {
          username: dto.username,
          password: hashedPassword,
          role: dto.role,
        });
        user = await queryRunner.manager.save(User, newUser);
      }

      await queryRunner.manager.save(Manager, {
        userId: user.id,
      });

      await queryRunner.commitTransaction();

      const tokens = await this.login({
        username: dto.username,
        password: dto.password,
        role: dto.role,
      });

      await this.slack.sendMessage({
        text: `[${process.env.NODE_ENV}-api] 🥳 회원가입(credentials) : <${process.env.APP_URL}/users/${user.id}|${user.username ?? dto.role}>`,
      });

      return tokens;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(err);
      if (err instanceof ConflictException) {
        throw new BadRequestException(HttpErrorConstants.ALREADY_REGISTERED);
      }
      throw new BadRequestException(HttpErrorConstants.INTERNAL_DATABASE_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 로그인
  //? ---------------------------------------------------------------------- ?//

  // 로그인 w/ Credentials
  async login(dto: UserCredentialsDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto);

    const payload = {
      sub: user.id,
      username: user.username,
      role: dto.role,
    };
    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: '1m', // ONE_MIN
    };
    const accessToken = await this.jwtService.signAsync(
      payload,
      accessTokenOptions,
    );

    // Refresh Token 생성 및 저장
    const refreshToken = `XYZ-${user.id}-${dto.role.toLowerCase()}-${uuid.v4()}`;
    const partialToken = refreshToken.slice(0, 36);
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + THIRTY_DAYS);

    const tokenRepository = this.dataSource.getRepository<Token>('Token');
    await tokenRepository.upsert(
      {
        userId: user.id,
        role: dto.role,
        partialToken,
        hashedToken,
        expiresAt,
      },
      ['userId', 'role', 'partialToken'],
    );

    return {
      user: plainToClass(User, user),
      role: dto.role,
      accessToken,
      refreshToken, // controller 에서 쿠키에 저장용
    };
  }

  //? ---------------------------------------------------------------------- ?//
  //? 로그아웃
  //? client 에서 refreshToken 을 갖고 있다면, 특정 connection 만 로그아웃 가능
  //? 아니면 해당 사용자 모든 connection 로그아웃
  //? ---------------------------------------------------------------------- ?//

  async logout(
    userId: number,
    role: Role,
    refreshToken?: string | null,
  ): Promise<void> {
    const tokenRepository = this.dataSource.getRepository<Token>('Token');

    if (refreshToken) {
      const partialToken = refreshToken.slice(0, 36);
      const tokenRecord = await tokenRepository.findOne({
        where: {
          userId,
          role,
          partialToken,
        },
      });
      if (
        tokenRecord &&
        (await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
      ) {
        await tokenRepository.delete(tokenRecord.id);
      }
    } else {
      await tokenRepository.delete({ userId, role });
    }
  }

  async logoutAll(userId: number) {
    const tokenRepository = this.dataSource.getRepository<Token>('Token');
    await tokenRepository.delete({ userId });
  }

  //? ---------------------------------------------------------------------- ?//
  //? access 토큰 refresh
  //? cookie 또는 bearer header 필요 (jwt auth guard 와 strategy 확인)
  //? ---------------------------------------------------------------------- ?//

  async refreshToken(
    userId: number,
    role: Role,
    refreshToken: string,
  ): Promise<RefreshResponseDto> {
    const tokenRepository = this.dataSource.getRepository<Token>('Token');
    const tokenRecord = await tokenRepository.findOne({
      where: {
        userId: userId,
        role: role,
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
    let hasRole = false;
    if (tokenRecord.role === Role.INSTRUCTOR && user.instructor) hasRole = true;
    else if (tokenRecord.role === Role.PARENT && user.parent) hasRole = true;
    else if (tokenRecord.role === Role.MANAGER && user.manager) hasRole = true;
    if (!hasRole) {
      throw new UnauthorizedException(HttpErrorConstants.ACCESS_DENIED);
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role,
    };
    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: '1m', // ONE_MIN
    };
    const accessToken = await this.jwtService.signAsync(
      payload,
      accessTokenOptions,
    );

    // 토큰내용 디버깅
    // const decoded = this.jwtService.decode(accessToken);
    // console.log('🐶 Token:', accessToken);
    // console.log('🐶 Decoded Token:', decoded);
    // console.log('🐶 Expiration Duration (seconds):', decoded.exp - decoded.iat);
    // console.log(
    //   '🐶 Expires At (KST):',
    //   new Date(decoded.exp * 1000).toLocaleString('ko-KR', {
    //     timeZone: 'Asia/Seoul',
    //   }),
    // );

    return {
      accessToken,
    };
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 이메일 확인코드 확인 후 비밀번호 갱신
  //? ---------------------------------------------------------------------- ?//

  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const userRepository = this.dataSource.getRepository<User>('User');
    const user = await userRepository.findOne({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_PHONE);
    }

    // const key = `${this.env}:user:${user.id}:otp`;
    // const value = await this.cacheManager.get(key);
    // if (!value) {
    //   throw new BadRequestException('otp expired');
    // } else if (value !== dto.code) {
    //   throw new BadRequestException('otp mismatched');
    // }

    const updatedUser = await userRepository.preload({
      id: user.id,
      password: dto.password,
    });
    if (!updatedUser) {
      throw new NotFoundException(HttpErrorConstants.NOT_FOUND_USER);
    }
    return await userRepository.save(updatedUser);
  }

  // async forgotPassword(email: string): Promise<void> {
  //   try {
  //     await this.userOtpsService.sendOtpForExistingUser(email);
  //   } catch (e) {
  //     throw new NotFoundException('entity not found');
  //   }
  // }
}
