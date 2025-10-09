import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolTermComboController } from 'src/domain/school/school-term-combo.controller';
import { SchoolTermComboService } from 'src/domain/school/school-term-combo.service';
import { SchoolTermLessonController } from 'src/domain/school/school-term-lesson.controller';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import { SchoolTermNewsletterController } from 'src/domain/school/school-term-newsletter.controller';
import { SchoolTermNewsletterService } from 'src/domain/school/school-term-newsletter.service';
import { SchoolTermOfferingController } from 'src/domain/school/school-term-offering.controller';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';
import { SchoolTermReminderController } from 'src/domain/school/school-term-reminder.controller';
import { SchoolTermReminderService } from 'src/domain/school/school-term-reminder.service';
import { SchoolTermSamController } from 'src/domain/school/school-term-sam.controller';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { SchoolTermSchooldayController } from 'src/domain/school/school-term-schoolday.controller';
import { SchoolTermSchooldayService } from 'src/domain/school/school-term-schoolday.service';
import { SchoolTermStudentController } from 'src/domain/school/school-term-student.controller';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
import { SchoolTermSurveyController } from 'src/domain/school/school-term-survey.controller';
import { SchoolTermSurveyService } from 'src/domain/school/school-term-survey.service';
import { SchoolTermController } from 'src/domain/school/school-term.controller';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { SqsModule } from 'src/services/aws/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Group,
      Lesson,
      Newsletter,
      Offering,
      Reminder,
      Sam,
      School,
      Schoolday,
      Student,
      Survey,
      Term,
    ]),
    LessonModule,
    SqsModule,
  ],
  controllers: [
    SchoolTermController,
    SchoolTermSamController,
    SchoolTermSchooldayController,
    SchoolTermStudentController,
    SchoolTermComboController,
    SchoolTermLessonController,
    SchoolTermNewsletterController,
    SchoolTermReminderController,
    SchoolTermSurveyController,
    SchoolTermOfferingController,
  ],
  providers: [
    SchoolTermService,
    SchoolTermSamService,
    SchoolTermSchooldayService,
    SchoolTermStudentService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermNewsletterService,
    SchoolTermReminderService,
    SchoolTermSurveyService,
    SchoolTermOfferingService,
  ],
  exports: [
    SchoolTermService,
    SchoolTermSamService,
    SchoolTermStudentService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermNewsletterService,
    SchoolTermReminderService,
    SchoolTermSurveyService,
    SchoolTermOfferingService,
  ],
})
export class SchoolTermModule {}
