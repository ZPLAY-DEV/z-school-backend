import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';
import { ONE_HOUR, THIRTY_DAYS } from 'src/common/constants';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums';
import { IRequestUser } from 'src/common/interfaces';
import { AuthService } from 'src/domain/auth/auth.service';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { AuthUserDto } from 'src/domain/auth/dto/auth-user.dto';
import { LoginCredentialsDto } from 'src/domain/auth/dto/login-credentials.dto';
import { LoginResponseDto } from 'src/domain/auth/dto/login-response.dto';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import {
  RegisterCredentialsDto,
  RegisterManagerCredentialsDto,
} from 'src/domain/auth/dto/register-credentials.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import { SwitchSchoolDto } from 'src/domain/auth/dto/switch-school.dto';
import { UserDto } from 'src/domain/auth/dto/user.dto';
import {
  GetMeDocs,
  LoginDocs,
  LoginWithNanoidDocs,
  LogOutDocs,
  RefreshDocs,
  RegisterDocs,
  RegisterManagerDocs,
  ResetPasswordDocs,
  SwitchSchoolDocs,
} from 'src/domain/auth/swagger/auth-swagger.decorator';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✳️ Auth ( 인증 )')
@Controller('auth')
export class AuthController {
  private readonly environment: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 가입, 이메일인증, 비번재설정
  //? ---------------------------------------------------------------------- ?//

  @RegisterDocs()
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterCredentialsDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    if (!dto.username) {
      dto.username = dto.phone;
    }

    const tokenResponse = await this.authService.register(dto);

    res.cookie('accessToken', tokenResponse.accessToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokenResponse.refreshToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokenResponse;
  }

  @RegisterManagerDocs()
  @Public()
  @Post('register/manager')
  async registerManager(
    @Body() dto: RegisterManagerCredentialsDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const tokenResponse = await this.authService.registerManager(dto);

    res.cookie('accessToken', tokenResponse.accessToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokenResponse.refreshToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokenResponse;
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
    @Body() dto: LoginCredentialsDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const tokens = await this.authService.login(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return tokens;
  }

  @LoginWithNanoidDocs()
  @HttpCode(200)
  @Public()
  @Post('login/nanoid/:id')
  async loginWithNanoid(
    @Param('id') id: string,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUserDto> {
    const tokens = await this.authService.loginWithNanoid(id);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
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
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [, userId, role] = refreshToken.split('-') ?? [];

    if (!userId || !role) {
      throw new UnauthorizedException('Invalid token');
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
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });

    return tokens;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 학교 전환
  //? ---------------------------------------------------------------------- ?//

  @SwitchSchoolDocs()
  @HttpCode(200)
  @Post('switch-school')
  async switchSchool(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SwitchSchoolDto,
  ): Promise<AuthTokenDto> {
    const user = req['user'] as IRequestUser;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Extract schoolId from header as fallback
    const headerSchoolId = req.headers['x-school-id']
      ? parseInt(req.headers['x-school-id'] as string)
      : null;

    const tokens = await this.authService.switchSchool(
      user.id,
      dto.role,
      dto.schoolId ?? headerSchoolId ?? null,
    );

    // Update cookies with new tokens
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.environment === 'prod',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    // res.cookie('refreshToken', tokens.refreshToken, {
    //   httpOnly: true,
    //   secure: this.environment === 'prod',
    //   sameSite: 'lax',
    //   path: '/',
    //   maxAge: THIRTY_DAYS,
    // });

    return tokens;
  }

  //? ---------------------------------------------------------------------- ?//
  //? 내 정보 조회
  //? ---------------------------------------------------------------------- ?//

  @GetMeDocs()
  @Get('me')
  async getMe(@Req() req: ExpressRequest): Promise<UserDto> {
    const user = req['user'] as IRequestUser;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.authService.getCurrentUser(user.id, user.role);
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
      secure: this.environment === 'prod',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }
}
