import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { REDIS_MESSAGE_CLIENT } from 'src/common/constants/index';
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @Inject(REDIS_MESSAGE_CLIENT) private readonly redisClient: ClientProxy,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? EVERY 5 MINTUES
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTenSeconds() {
    await lastValueFrom(
      this.redisClient.emit('RealTime', {
        payload: 'test',
      }),
    );

    this.logger.debug(`cron every 5 mins @${new Date().toLocaleString()}`);
  }
}
