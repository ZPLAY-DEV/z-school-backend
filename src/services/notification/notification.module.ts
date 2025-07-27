import { Module } from '@nestjs/common';
import { AligoModule } from 'src/services/aligo/aligo.module';
import { FirehoseService } from 'src/services/aws/firehose.service';
import { SqsModule } from 'src/services/aws/sqs.module';
import { FcmModule } from 'src/services/fcm/fcm.module';
import { NotificationService } from './notification.service';

@Module({
  imports: [FcmModule, AligoModule, SqsModule],
  providers: [NotificationService, FirehoseService],
  exports: [NotificationService],
})
export class NotificationModule {}
