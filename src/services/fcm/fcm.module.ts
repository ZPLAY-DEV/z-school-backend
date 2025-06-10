import { Module } from '@nestjs/common';
import { SqsModule } from 'src/services/aws/sqs.module';
import { FcmService } from 'src/services/fcm/fcm.service';

@Module({
  imports: [SqsModule],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
