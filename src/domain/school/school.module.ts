import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolCalendarController } from 'src/domain/school/school-calendar.controller';
import { SchoolInstructorController } from 'src/domain/school/school-instructor.controller';
import { SchoolInstructorService } from 'src/domain/school/school-instructor.service';
import { SchoolTermLessonController } from 'src/domain/school/school-term-lesson.controller';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import { SchoolTermController } from 'src/domain/school/school-term.controller';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { NeisModule } from 'src/services/neis/neis-module';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';
import { SchoolCalendarService } from './school-calendar.service';
import { SchoolStudentController } from './school-student.controller';
import { SchoolStudentService } from './school-student.service';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([School, Student, Term, Parent, Instructor]),
    UploadModule,
    SlackModule,
    S3Module,
    NeisModule,
  ],
  controllers: [
    SchoolController,
    SchoolCalendarController,
    SchoolInstructorController,
    SchoolStudentController,
    SchoolTermController,
    SchoolTermLessonController,
  ],
  providers: [
    SchoolService,
    SchoolCalendarService,
    SchoolInstructorService,
    SchoolStudentService,
    SchoolTermService,
    SchoolTermLessonService,
  ],
})
export class SchoolModule {}
