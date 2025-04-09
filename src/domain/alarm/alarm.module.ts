import { Module } from '@nestjs/common';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AlarmController } from 'src/domain/alarm/alarm.controller';
import { AlarmService } from 'src/domain/alarm/alarm.service';
import { AlarmSchema } from 'src/domain/alarm/entities/alarm.schema';
import { S3Module } from 'src/services/aws/s3.module';

//! With correct module configuration, the local dynamoDB is populated automatically
//! as soon as executing any creation method.
@Module({
  imports: [
    DynamooseModule.forFeature([
      {
        name: 'Alarm',
        schema: AlarmSchema,
        options: {
          tableName: 'alarm', // e.g. local_alarm_table
        },
      },
    ]),
    S3Module,
  ],
  providers: [AlarmService],
  controllers: [AlarmController],
  exports: [AlarmService],
})
export class AlarmModule {}
