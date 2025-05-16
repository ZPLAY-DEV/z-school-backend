import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorSchool } from 'src/domain/instructor/entities/instructor-school.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { InstructorGroupController } from 'src/domain/instructor/instructor-group.controller';
import { InstructorGroupService } from 'src/domain/instructor/instructor-group.service';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instructor, Group, InstructorSchool]),
    UploadModule,
    SlackModule,
  ],
  controllers: [InstructorController, InstructorGroupController],
  providers: [InstructorService, InstructorGroupService],
})
export class InstructorModule {}
