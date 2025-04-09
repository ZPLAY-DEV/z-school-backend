import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { REDIS_MESSAGE_CLIENT } from 'src/common/constants';

@Controller('cron')
export class CronController {
  constructor(
    @Inject(REDIS_MESSAGE_CLIENT) private readonly redisClient: ClientProxy,
  ) {}

  @ApiOperation({ description: 'Redis client 테스트' })
  @Post('redis')
  async redis(@Body() data: any): Promise<any> {
    console.log(data, '<= dispatch RealTime event via API');
    return await lastValueFrom(this.redisClient.emit('RealTime', data));
  }
}
