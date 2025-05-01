import {
  Body,
  ClassSerializerInterceptor,
  Controller,
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
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { AuthService } from 'src/domain/auth/auth.service';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';
import {
  LoginDocs,
  LogOutDocs,
  RefreshDocs,
  RegisterDocs,
  RegisterManagerDocs,
  ResetPasswordDocs,
} from './swagger/rest-swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Auth(인증)')
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
  ) {
    const { refreshToken, ...tokens } = await this.authService.register(dto);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_HOUR,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return HttpResponse.created(tokens);
  }

  @RegisterManagerDocs()
  @Public()
  @Post('register/manager')
  async registerManager(@Body() dto: UserCredentialsDto) {
    const tokens = await this.authService.registerManager(dto);

    return HttpResponse.created(tokens);
  }

  @ResetPasswordDocs()
  @Public()
  @Patch('reset')
  async resetPassword(
    @Body(HashPasswordPipe) dto: ResetPasswordDto,
  ): Promise<HttpResponse> {
    await this.authService.resetPassword(dto);

    return HttpResponse.ok();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 로그인
  //? ---------------------------------------------------------------------- ?//

  @LoginDocs()
  @Public()
  @Post('login')
  async login(
    @Body() dto: UserCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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

    return HttpResponse.created(tokens);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Public) 토큰 refresh
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @RefreshDocs()
  @Post('refresh')
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HttpResponse> {
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
      role.toUpperCase() as Role,
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

    return HttpResponse.created(tokens);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 로그아웃
  //? ---------------------------------------------------------------------- ?//

  @LogOutDocs()
  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUserIdAndRole() { userId, role }: { userId: number; role: Role },
    @Body() dto: LogoutDto,
  ): Promise<HttpResponse> {
    await this.authService.logout(userId, role, dto.refreshToken);

    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return HttpResponse.ok();
  }
}
