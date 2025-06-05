import { Module } from '@nestjs/common';
import { FirehoseService } from 'src/services/aws/firehose.service';

@Module({
  providers: [FirehoseService],
  exports: [FirehoseService],
})
export class FirehoseModule {}
