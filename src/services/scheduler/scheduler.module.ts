import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { LambdaModule } from '../aws/lambda.module';
import { EventBridgeModule } from '../aws/event-bridge.module';
import { SqsModule } from '../aws/sqs.module';

@Module({
  imports: [LambdaModule, EventBridgeModule, SqsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
