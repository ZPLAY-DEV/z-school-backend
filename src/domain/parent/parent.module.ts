import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ParentNanoIdController } from 'src/domain/parent/parent-nanoid.controller';
import { ParentNanoIdService } from 'src/domain/parent/parent-nanoid.service';
import { ParentController } from 'src/domain/parent/parent.controller';
import { ParentService } from 'src/domain/parent/parent.service';
import { S3Module } from 'src/services/aws/s3.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { ParentStudentController } from './parent-student.controller';
import { ParentStudentService } from './parent-student.service';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, NanoId]), S3Module, SlackModule],
  controllers: [
    ParentController,
    ParentStudentController,
    ParentNanoIdController,
  ],
  providers: [ParentService, ParentStudentService, ParentNanoIdService],
})
export class ParentModule {}
