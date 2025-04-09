import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentRefreshToken } from 'src/common/decorators/current-refresh-token.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthCookieInterceptor } from 'src/common/interceptors/auth-cookie.interceptor';
// import { Tokens } from 'src/common/types';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { AuthService } from 'src/domain/auth/auth.service';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import { UserCredentialsDto } from 'src/domain/auth/dto/user-credentials.dto';
import { JwtRefreshGuard } from 'src/domain/auth/guards/jwt-refresh.guard';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';

// import { Response } from 'express';
import {
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

  @RegisterDocs()
  @Public()
  @Post('register')
  async register(@Body(HashPasswordPipe) dto: UserCredentialsDto) {
    const tokens = await this.authService.register(dto);
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

  @ApiOperation({ description: '로그인 w/ Phone #' })
  @Public()
  @UseInterceptors(AuthCookieInterceptor)
  @ApiCreatedResponse({ description: 'login 성공' })
  @Post('login')
  async login(@Body() dto: UserCredentialsDto): Promise<HttpResponse> {
    const tokens = await this.authService.login(dto);
    return HttpResponse.created(tokens);
  }

  //? ----------------------------------------------------------------------- //
  //? Public) 토큰 refresh
  //? ----------------------------------------------------------------------- //

  @ApiOperation({ description: '사용자 Refresh 토큰 갱신' })
  @Public()
  @UseInterceptors(AuthCookieInterceptor)
  @UseGuards(JwtRefreshGuard)
  @ApiCreatedResponse({ description: 'refresh 성공' })
  @Post('refresh')
  async refresh(
    @CurrentUserId() id: number,
    @CurrentRefreshToken() token: string,
  ): Promise<HttpResponse> {
    const tokens = await this.authService.refreshToken(id, token);
    return HttpResponse.created(tokens);
  }

  //? ----------------------------------------------------------------------- //
  //? 로그아웃
  //? ----------------------------------------------------------------------- //

  @ApiOperation({ description: '사용자 로그아웃' })
  @HttpCode(HttpStatus.OK)
  @ApiCreatedResponse({ description: '성공' })
  @Post('logout')
  logout(@CurrentUserId() id: number): Promise<void> {
    return this.authService.logout(id);
  }
}
