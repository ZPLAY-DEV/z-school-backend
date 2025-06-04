import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';
import { ONE_HOUR, THIRTY_DAYS } from 'src/common/constants';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { AuthService } from 'src/domain/auth/auth.service';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { AuthUserDto } from 'src/domain/auth/dto/auth-user.dto';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
  UserNanoIdDto,
} from 'src/domain/auth/dto/user-credentials.dto';
import {
  LoginDocs,
  LogOutDocs,
  RefreshDocs,
  RegisterDocs,
  RegisterManagerDocs,
  ResetPasswordDocs,
} from 'src/domain/auth/swagger/auth-swagger.decorator';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Auth ( 인증 )')
@ApiCommonErrorResponseTemplate()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Public) 가입, 이메일인증, 비번재설정
  //? ---------------------------------------------------------------------- ?//

  @RegisterDocs()
  @Public()
  @Post('register')
  async register(
    @Body() dto: UserCredentialsDtoWithPhone,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    if (!dto.username) {
      dto.username = dto.phone;
    }
    const tokens = await this.authService.register(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokens;
  }

  @RegisterManagerDocs()
  @Public()
  @Post('register/manager')
  async registerManager(
    @Body() dto: UserCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const tokens = await this.authService.registerManager(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokens;
  }

  @ResetPasswordDocs()
  @Public()
  @Patch('reset')
  async resetPassword(
    @Body(HashPasswordPipe) dto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 로그인
  //? ---------------------------------------------------------------------- ?//

  @LoginDocs()
  @HttpCode(200)
  @Public()
  @Post('login')
  async login(
    @Body() dto: UserCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const tokens = await this.authService.login(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokens;
  }

  @HttpCode(200)
  @Public()
  @Post('login/nanoid')
  async loginWithNanoId(
    @Body() dto: UserNanoIdDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const tokens = await this.authService.loginWithNanoId(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokens;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 토큰 refresh
  //? ---------------------------------------------------------------------- ?//

  @RefreshDocs()
  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokenDto> {
    const authHeader = req.get('Authorization');
    const refreshToken =
      req.cookies?.refreshToken ||
      (authHeader?.startsWith('Bearer ')
        ? authHeader.replace(/^Bearer\s/, '').trim()
        : null);

    if (!refreshToken) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_TOKEN);
    }

    const [, userId, role] = refreshToken.split('-') ?? [];

    if (!userId || !role) {
      throw new UnauthorizedException(HttpErrorConstants.INVALID_TOKEN);
    }

    const tokens = await this.authService.refreshToken(
      +userId,
      role === 'P'
        ? Role.PARENT
        : role === 'I'
          ? Role.INSTRUCTOR
          : role === 'M'
            ? Role.MANAGER
            : Role.ADMIN,
      refreshToken as string,
    );

    // Update accessToken cookie only
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });

    return tokens;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 로그아웃
  //? ---------------------------------------------------------------------- ?//

  @LogOutDocs()
  @HttpCode(200)
  @Public()
  @Post('logout')
  async logout(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    // Extract refresh token from cookie or auth header
    const refreshToken = dto.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const [, userId, role] = refreshToken.split('-') ?? [];

        if (userId && role) {
          await this.authService.logout(
            +userId,
            role === 'P'
              ? Role.PARENT
              : role === 'I'
                ? Role.INSTRUCTOR
                : role === 'M'
                  ? Role.MANAGER
                  : Role.ADMIN,
            refreshToken as string,
          );
        }
      } catch {
        // Silently ignore errors during logout
      }
    }

    // Clear cookies regardless of token status
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }
}
