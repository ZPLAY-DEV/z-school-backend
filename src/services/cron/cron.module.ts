import { Module } from '@nestjs/common';
import { CronController } from 'src/services/cron/cron.controller';
import { CronService } from 'src/services/cron/cron.service';

@Module({
  providers: [CronService],
  controllers: [CronController], // to test out RMQ client. can be removed later.
})
export class CronModule {}
