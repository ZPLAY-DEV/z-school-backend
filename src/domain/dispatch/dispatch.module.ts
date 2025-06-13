import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from './entities/dispatch.entity';
import { DynamooseModule } from 'nestjs-dynamoose';
import { DispatchSchema } from './entities/dispatch.schema';
import { SqsModule } from 'src/services/aws/sqs.module';
import { DispatchService } from './dispatch.service';
import { NanoId } from '../parent/entities/nanoid.entity';
import { RedisModule } from 'src/services/redis/redis.module';
import { SchedulerModule } from 'src/services/scheduler/scheduler.module';
import { DispatchRead } from './entities/dispatch-read.entity';
import { DispatchCoreService } from './dispatch-core.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch, DispatchRead, NanoId]),
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
    RedisModule,
    SchedulerModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchCoreService],
})
export class DispatchModule {}
