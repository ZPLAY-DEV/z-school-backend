import { Module } from '@nestjs/common';
import { SqsService } from 'src/services/aws/sqs.service';
@Module({
  providers: [SqsService],
  exports: [SqsService],
})
export class SqsModule {}
