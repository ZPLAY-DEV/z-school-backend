import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentRefreshToken } from 'src/common/decorators/current-refresh-token.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enums';
import { AuthCookieInterceptor } from 'src/common/interceptors/auth-cookie.interceptor';
import { IRequestUser } from 'src/common/interfaces';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { AuthService } from 'src/domain/auth/auth.service';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';
import { JwtRefreshGuard } from 'src/domain/auth/guards/jwt-refresh.guard';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';
import {
  LoginDocs,
  LogOutDocs,
  RefreshDocs,
  RegisterDocs,
  ResetPasswordDocs,
} from './swagger/rest-swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Auth(인증)')
@ApiCommonErrorResponseTemplate()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //? ----------------------------------------------------------------------- //
  //? Public) 가입, 이메일인증, 비번재설정
  //? ----------------------------------------------------------------------- //

  //  @RegisterDocs()
  @Public()
  @Post('register')
  async register(@Body() dto: UserCredentialsDtoWithPhone) {
    const tokens = await this.authService.register(dto);

    return HttpResponse.created(tokens);
  }

  @RegisterDocs()
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

  //? ----------------------------------------------------------------------- //
  //? Public) 로그인
  //? ----------------------------------------------------------------------- //

  @LoginDocs()
  @Public()
  @UseInterceptors(AuthCookieInterceptor)
  @Post('login')
  async login(@Body() dto: UserCredentialsDto) {
    const tokens = await this.authService.login(dto);

    return HttpResponse.created(tokens);
  }

  //? ----------------------------------------------------------------------- //
  //? Public) 토큰 refresh
  //? ----------------------------------------------------------------------- //

  @RefreshDocs()
  @UseInterceptors(AuthCookieInterceptor)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @CurrentRefreshToken() user: IRequestUser,
  ): Promise<HttpResponse> {
    const tokens = await this.authService.refreshToken(
      +user.id,
      user.refreshToken ?? '',
      user.role,
    );

    return HttpResponse.created(tokens);
  }

  //? ----------------------------------------------------------------------- //
  //? 로그아웃
  //? ----------------------------------------------------------------------- //

  @LogOutDocs()
  @Post('logout')
  async logout(@CurrentUserId() id: number, role: Role): Promise<HttpResponse> {
    await this.authService.logout(id, role);

    return HttpResponse.ok();
  }
}
