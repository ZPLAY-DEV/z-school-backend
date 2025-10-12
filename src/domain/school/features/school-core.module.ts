import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolCalendarController } from 'src/domain/school/school-calendar.controller';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { SchoolController } from 'src/domain/school/school.controller';
import { SchoolService } from 'src/domain/school/school.service';
import { S3Module } from 'src/services/aws/s3.module';
import { CacheModule } from 'src/services/cache/cache.module';
import { NeisModule } from 'src/services/neis/neis.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Calendar]),
    UploadModule,
    S3Module,
    NeisModule,
    RedisModule,
    CacheModule,
  ],
  controllers: [SchoolController, SchoolCalendarController],
  providers: [SchoolService, SchoolCalendarService],
  exports: [SchoolService, SchoolCalendarService],
})
export class SchoolCoreModule {}
