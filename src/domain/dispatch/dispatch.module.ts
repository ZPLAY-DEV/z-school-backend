import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from './entities/dispatch.entity';
import { DynamooseModule } from 'nestjs-dynamoose';
import { DispatchSchema } from './entities/dispatch.schema';
import { SqsModule } from 'src/services/aws/sqs.module';
import { EventBridgeModule } from 'src/services/aws/event-bridge.module';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch]),
    DynamooseModule.forFeature([
      {
        name: 'Dispatch',
        schema: DispatchSchema,
        options: {
          tableName: 'dispatch',
        },
      },
    ]),
    SqsModule,
    EventBridgeModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
