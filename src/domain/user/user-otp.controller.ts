import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';
import { ThrottlerBehindProxyGuard } from 'src/common/guards/throttler-behind-proxy.guard';
import { UpdateUserDto } from 'src/domain/user/dto/update-user.dto';
import { User } from 'src/domain/user/entities/user.entity';
import { UserOtpService } from 'src/domain/user/user-otp.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UserOtpController {
  constructor(private readonly userOtpService: UserOtpService) {}

  //? ----------------------------------------------------------------------- //
  //? 본인인증 OTP 발송 (1분에 최대 2번)
  //? ----------------------------------------------------------------------- //

  @ApiOperation({ description: 'non-existing key(phone/email) OTP 발급' })
  @UseGuards(ThrottlerBehindProxyGuard)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':key/otp')
  async sendOtpForNonExistingUser(
    @Param('key') key: string,
    @Query('cache') cache?: string,
  ): Promise<any> {
    await this.userOtpService.sendOtpForNonExistingUser(key, !!cache);
    return { data: 'ok' };
  }

  //? 전화번호(이메일) 업데이트
  // prerequisite)
  // - 기존정보 확인 (전화번호나 이메일)
  // - any user associated w/ old phone or email must exist.
  // - 비번 확인
  // 1) any user associated w/ new phone or email must not exist.
  // 2) 바꿀 새로운 phone or email 로 비번 전송
  @ApiOperation({ description: 'existing key(phone/email) OTP 발급' })
  @UseGuards(ThrottlerBehindProxyGuard)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':key/change')
  async sendOtpForExistingUser(
    @Param('key') key: string,
    @Query('cache') cache?: string,
  ): Promise<string> {
    await this.userOtpService.sendOtpForExistingUser(key, !!cache);
    return key;
  }

  @ApiOperation({ description: 'OTP 코드 검사 및 User 갱신' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Patch(':key/otp/:otp')
  async checkOtp(
    @Param('key') key: string,
    @Param('otp') otp: string,
    @Body() dto: UpdateUserDto,
    @Query('cache') cache?: string,
  ): Promise<User> {
    return await this.userOtpService.updateUserIfOtpMatches(
      key,
      otp,
      !!cache,
      dto,
    );
  }
}
