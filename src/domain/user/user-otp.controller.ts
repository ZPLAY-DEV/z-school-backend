import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Secret } from 'src/domain/user/entities/secret.entity';
import { UserOtpService } from 'src/domain/user/user-otp.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UserOtpController {
  constructor(private readonly userOtpService: UserOtpService) {}

  //? ---------------------------------------------------------------------- ?//
  //? 본인인증 OTP 발송 (1분에 최대 2번)
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'non-existing user(phone/email) 으로 OTP 발급' })
  // @UseGuards(ThrottlerBehindProxyGuard)
  // @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':key/nonexisting')
  async sendOtpForNonExistingUser(
    @Param('key') key: string,
    @Body('role') role: string,
  ): Promise<any> {
    if (
      role.toLowerCase() !== 'parent' &&
      role.toLowerCase() !== 'instructor'
    ) {
      throw new BadRequestException('Invalid role');
    }
    await this.userOtpService.sendOtpForNonExistingUser(
      key,
      role.toUpperCase(),
    );
    return { data: 'ok' };
  }

  @ApiOperation({ description: 'existing user(phone/email) 으로 OTP 발급' })
  // @UseGuards(ThrottlerBehindProxyGuard)
  // @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':key/otp')
  async sendOtpForExistingUser(
    @Param('key') key: string,
    @Body('role') role: string,
  ): Promise<string> {
    if (
      role.toUpperCase() !== 'PARENT' &&
      role.toUpperCase() !== 'INSTRUCTOR'
    ) {
      throw new BadRequestException('Invalid role');
    }

    await this.userOtpService.sendOtpForExistingUser(key, role.toUpperCase());
    return key;
  }

  @ApiOperation({ description: 'OTP 코드 검사 및 User 갱신' })
  @Public()
  @Patch(':key/otp')
  async checkOtp(
    @Param('key') key: string,
    @Body('otp') otp: string,
  ): Promise<Secret> {
    return await this.userOtpService.checkOtp(key, otp);
  }
}
