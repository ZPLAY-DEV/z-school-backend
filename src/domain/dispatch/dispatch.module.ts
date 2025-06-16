import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { SqsModule } from 'src/services/aws/sqs.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { NanoId } from '../parent/entities/nanoid.entity';
import { DispatchCoreService } from './dispatch-core.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchRead } from './entities/dispatch-read.entity';
import { Dispatch } from './entities/dispatch.entity';
import { DispatchSchema } from './entities/dispatch.schema';

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
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchCoreService],
})
export class DispatchModule {}
