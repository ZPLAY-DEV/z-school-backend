import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolTermComboController } from 'src/domain/school/school-term-combo.controller';
import { SchoolTermComboService } from 'src/domain/school/school-term-combo.service';
import { SchoolTermLessonController } from 'src/domain/school/school-term-lesson.controller';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import { SchoolTermOfferingController } from 'src/domain/school/school-term-offering.controller';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';
import { SchoolTermSamController } from 'src/domain/school/school-term-sam.controller';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { SchoolTermSchooldayController } from 'src/domain/school/school-term-schoolday.controller';
import { SchoolTermSchooldayService } from 'src/domain/school/school-term-schoolday.service';
import { SchoolTermStudentController } from 'src/domain/school/school-term-student.controller';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
import { SchoolTermController } from 'src/domain/school/school-term.controller';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { SqsModule } from 'src/services/aws/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Group,
      Lesson,
      Offering,
      Sam,
      School,
      Schoolday,
      Student,
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
    SchoolTermOfferingController,
  ],
  providers: [
    SchoolTermService,
    SchoolTermSamService,
    SchoolTermSchooldayService,
    SchoolTermStudentService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermOfferingService,
  ],
  exports: [
    SchoolTermService,
    SchoolTermSamService,
    SchoolTermStudentService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermOfferingService,
  ],
})
export class SchoolTermModule {}
