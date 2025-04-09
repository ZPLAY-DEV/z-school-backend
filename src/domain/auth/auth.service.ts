import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response as ExpressResponse } from 'express';
import { ONE_HOUR, TEN_MINS, THIRTY_DAYS } from 'src/common/constants';
import { Role } from 'src/common/enums';
import { Tokens } from 'src/common/interfaces';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import { UserCredentialsDto } from 'src/domain/auth/dto/user-credentials.dto';
import { User } from 'src/domain/user/entities/user.entity';
import { UserService } from 'src/domain/user/user.service';
import { SlackService } from 'src/services/slack/slack-service';
import { DataSource } from 'typeorm';
import { HttpErrorConstants } from './helper/http.error.object';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly slack: SlackService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  //? ----------------------------------------------------------------------- //
  //? Passport local strategy
  //? ----------------------------------------------------------------------- //

  // being used in auth/strategies/local.strategy
  async validateUser(dto: UserCredentialsDto): Promise<User> {
    const user = await this.userService.findByUniqueKey({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new ForbiddenException('access denied');
    }
    if (!user.password) {
      throw new ForbiddenException(`user has no password`);
    }
    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new ForbiddenException('invalid credentials');
    }

    return user;
  }

  //? ----------------------------------------------------------------------- //
  //? Public) phone (가입/비번)
  //? ----------------------------------------------------------------------- //

  // phone 가입 w/ Credentials
  async register(dto: UserCredentialsDto): Promise<Tokens> {
    const { phone, password, role } = dto;

    // Find existing user or create new one
    let user = await this.userService.findByUniqueKey({
      where: { phone },
      relations: ['instructor', 'manager', 'parent'],
    });

    // Get the correct repository based on role
    let roleRepository;
    if (role === Role.PARENT) {
      roleRepository = this.dataSource.getRepository('Parent');
    } else if (role === Role.INSTRUCTOR) {
      roleRepository = this.dataSource.getRepository('Instructor');
    } else if (role === Role.MANAGER) {
      roleRepository = this.dataSource.getRepository('Manager');
    } else {
      throw new BadRequestException(HttpErrorConstants.INVALID_ROLE);
    }

    if (user) {
      // Check if user already has this role
      if (
        (role === Role.PARENT && user.parent) ||
        (role === Role.INSTRUCTOR && user.instructor) ||
        (role === Role.MANAGER && user.manager)
      ) {
        throw new BadRequestException(HttpErrorConstants.ALREADY_REGISTERED);
      }

      // Create role entity for existing user
      await roleRepository.save({
        userId: user.id,
        phone: phone,
      });
    } else {
      // Create new user
      user = await this.userService.create({
        phone,
        password,
        role,
      });

      // create role entity
      await roleRepository.save({
        userId: user.id,
        phone,
      });
    }

    // Generate tokens and update user
    const tokens = await this._getTokens(user);
    await this.userService.update(user.id, {
      refreshTokenHash: tokens.refreshToken
        ? await bcrypt.hash(tokens.refreshToken, 10)
        : null,
      role,
    });

    // Notify
    await this.slack.sendMessage({
      text: `[${process.env.NODE_ENV}-api] 🥳 회원가입(credentials) : <${process.env.APP_URL}/users/${user.id}|${role}>`,
    });

    return tokens;
  }
  //? ----------------------------------------------------------------------- //
  //? Public) 로그인
  //? ----------------------------------------------------------------------- //

  // 로그인 w/ Credentials
  async login(dto: UserCredentialsDto): Promise<Tokens> {
    const user = await this.validateUser(dto);
    const tokens = await this._getTokens(user);
    const refreshTokenHash = tokens.refreshToken
      ? await bcrypt.hash(tokens.refreshToken, 10)
      : null;
    await this.userService.update(user.id, {
      refreshTokenHash,
    });

    return tokens;
  }

  //? ----------------------------------------------------------------------- //
  //? Private) 로그아웃
  //? 로그아웃하면 refreshTokenHash 삭제
  //? ----------------------------------------------------------------------- //

  async logout(id: number): Promise<void> {
    await this.userService.update(id, {
      refreshTokenHash: null,
    });
  }

  //? ----------------------------------------------------------------------- //
  //? Public) 토큰 refresh
  //? cookie 또는 bearer header 필요 (jwt auth guard 와 strategy 확인)
  //? ----------------------------------------------------------------------- //

  async refreshToken(id: number, refreshToken: string | null): Promise<Tokens> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new ForbiddenException('access denied');
    }
    if (!user.refreshTokenHash) {
      throw new ForbiddenException('authentication required');
    }
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!refreshTokenMatches) {
      throw new ForbiddenException('invalid refresh token');
    }
    const tokens = await this._getTokens(user);
    const refreshTokenHash = tokens.refreshToken
      ? await bcrypt.hash(tokens.refreshToken, 10)
      : null;
    await this.userService.update(user.id, {
      refreshTokenHash,
    });

    return tokens;
  }

  //? ----------------------------------------------------------------------- //
  //? Public) 이메일 확인코드 확인 후 비밀번호 갱신
  //? ----------------------------------------------------------------------- //

  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const user = await this.userService.findByUniqueKey({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new NotFoundException('phone not found');
    }

    // const key = `${this.env}:user:${user.id}:otp`;
    // const value = await this.cacheManager.get(key);
    // if (!value) {
    //   throw new BadRequestException('otp expired');
    // } else if (value !== dto.code) {
    //   throw new BadRequestException('otp mismatched');
    // }

    return await this.userService.update(user.id, { password: dto.password });
  }

  //? ----------------------------------------------------------------------- //
  //? Cookies (deprecated in favor of auth-cookie.interceptor.ts)
  //? ----------------------------------------------------------------------- //

  storeTokensInCookie(res: ExpressResponse, authToken: Tokens) {
    // const ONE_MIN = 1000 * 60;
    res.cookie('access_token', authToken.accessToken, {
      maxAge: ONE_HOUR,
      httpOnly: true,
    });
    res.cookie('refresh_token', authToken.refreshToken, {
      maxAge: THIRTY_DAYS,
      httpOnly: true,
    });
  }

  //? ----------------------------------------------------------------------- //
  //? Privates
  //? ----------------------------------------------------------------------- //

  async _getTokens(user: User): Promise<Tokens> {
    const payload = {
      name: user.email,
      sub: user.id,
    };
    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: '1h', // change this window to '1h' if you want
    };
    const refreshTokenOptions = {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: '30d',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessTokenOptions),
      this.jwtService.signAsync(payload, refreshTokenOptions),
    ]);
    const expiresIn = Date.now() + TEN_MINS; //! 같이 수정할 것!

    // const now = moment();
    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  // async forgotPassword(email: string): Promise<void> {
  //   try {
  //     await this.userOtpsService.sendOtpForExistingUser(email);
  //   } catch (e) {
  //     throw new NotFoundException('entity not found');
  //   }
  // }
}
