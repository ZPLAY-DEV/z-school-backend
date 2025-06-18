import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolController } from 'src/domain/school/school.controller';
import { SchoolService } from 'src/domain/school/school.service';
import { SchoolCalendarController } from 'src/domain/school/school-calendar.controller';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { UploadModule } from 'src/services/upload/upload.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { S3Module } from 'src/services/aws/s3.module';
import { NeisModule } from 'src/services/neis/neis.module';
import { RedisModule } from 'src/services/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School]),
    UploadModule,
    SlackModule,
    S3Module,
    NeisModule,
    RedisModule,
  ],
  controllers: [SchoolController, SchoolCalendarController],
  providers: [SchoolService, SchoolCalendarService],
  exports: [SchoolService, SchoolCalendarService],
})
export class SchoolCoreModule {} 