import { Module } from '@nestjs/common';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { SqsModule } from 'src/services/aws/sqs.module';
import { FcmModule } from 'src/services/fcm/fcm.module';
import { SensModule } from 'src/services/ncloud/sens.module';
import { NotificationService } from './notification.service';

@Module({
  imports: [FcmModule, SensModule, SqsModule],
  providers: [NotificationService, FirehoseService],
  exports: [NotificationService],
})
export class NotificationModule {}
