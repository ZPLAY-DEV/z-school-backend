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
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolCalendarController } from 'src/domain/school/school-calendar.controller';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { SchoolLetterController } from 'src/domain/school/school-letter.controller';
import { SchoolLetterService } from 'src/domain/school/school-letter.service';
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
import { SqsModule } from 'src/services/aws/sqs.module';
import { NeisModule } from 'src/services/neis/neis.module';
import { RedisModule } from 'src/services/redis/redis.module';
import { SlackModule } from 'src/services/slack/slack.module';
import { UploadModule } from 'src/services/upload/upload.module';
import { Letter } from '../letter/entities/letter.entity';
import { SchoolBoardController } from 'src/domain/school/school-board.controller';
import { SchoolBoardService } from 'src/domain/school/school-board.service';
import { SchoolStudentController } from 'src/domain/school/school-student.controller';
import { SchoolStudentService } from 'src/domain/school/school-student.service';
import { SchoolTermSamController } from 'src/domain/school/school-term-sam.controller';
import { SchoolTermStudentController } from 'src/domain/school/school-term-student.controller';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board,
      Comment,
      Document,
      Instructor,
      Lesson,
      Letter,
      Offering,
      Parent,
      Sam,
      School,
      Student,
      Term,
    ]),
    UploadModule,
    SlackModule,
    S3Module,
    NeisModule,
    LessonModule,
    SqsModule,
    RedisModule,
  ],
  controllers: [
    SchoolController,
    SchoolCalendarController,
    SchoolSamController,
    SchoolStudentController,
    SchoolTermController,
    SchoolTermLessonController,
    SchoolTermSamController,
    SchoolTermStudentController,
    SchoolTermOfferingController,
    SchoolBoardController,
    SchoolLetterController,
  ],
  providers: [
    SchoolService,
    SchoolCalendarService,
    SchoolSamService,
    SchoolStudentService,
    SchoolTermService,
    SchoolTermLessonService,
    SchoolTermSamService,
    SchoolTermStudentService,
    SchoolTermOfferingService,
    SchoolBoardService,
    SchoolLetterService,
  ],
})
export class SchoolModule {}
