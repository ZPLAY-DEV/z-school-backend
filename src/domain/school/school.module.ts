import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from 'src/domain/board/entities/board.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
import { Document } from 'src/domain/document/entities/document.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Phone } from 'src/domain/phone/entities/phone.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolCalendarController } from 'src/domain/school/school-calendar.controller';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { SchoolSamController } from 'src/domain/school/school-sam.controller';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { SchoolTermLessonController } from 'src/domain/school/school-term-lesson.controller';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import { SchoolTermOfferingController } from 'src/domain/school/school-term-offering.controller';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';
import { SchoolTermController } from 'src/domain/school/school-term.controller';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { SchoolController } from 'src/domain/school/school.controller';
import { SchoolService } from 'src/domain/school/school.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { NeisModule } from 'src/services/neis/neis.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { UploadModule } from 'src/services/upload/upload.module';
import { SchoolBoardController } from './school-board.controller';
import { SchoolBoardService } from './school-board.service';
import { SchoolPhoneController } from './school-phone.controller';
import { SchoolPhoneService } from './school-phone.service';
import { SchoolStudentController } from './school-student.controller';
import { SchoolStudentService } from './school-student.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      Student,
      Lesson,
      Document,
      Term,
      Offering,
      Parent,
      Instructor,
      Sam,
      Phone,
      Board,
      Comment,
    ]),
    UploadModule,
    SlackModule,
    S3Module,
    NeisModule,
    LessonModule,
  ],
  controllers: [
    SchoolController,
    SchoolCalendarController,
    SchoolSamController,
    SchoolStudentController,
    SchoolTermController,
    SchoolTermLessonController,
    SchoolTermOfferingController,
    SchoolPhoneController,
    SchoolBoardController,
  ],
  providers: [
    SchoolService,
    SchoolCalendarService,
    SchoolSamService,
    SchoolStudentService,
    SchoolTermService,
    SchoolTermLessonService,
    SchoolTermOfferingService,
    SchoolPhoneService,
    SchoolBoardService,
  ],
})
export class SchoolModule {}
