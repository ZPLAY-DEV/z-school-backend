import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from 'src/domain/term/entities/term.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { SchoolTermController } from 'src/domain/school/school-term.controller';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { SchoolTermStudentController } from 'src/domain/school/school-term-student.controller';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
import { SchoolTermSamController } from 'src/domain/school/school-term-sam.controller';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { SchoolTermLessonController } from 'src/domain/school/school-term-lesson.controller';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import { SchoolTermOfferingController } from 'src/domain/school/school-term-offering.controller';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';
import { LessonModule } from 'src/domain/lesson/lesson.module';
import { SqsModule } from 'src/services/aws/sqs.module';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolTermComboService } from 'src/domain/school/school-term-combo.service';
import { SchoolTermComboController } from 'src/domain/school/school-term-combo.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Term, Student, Sam, School, Lesson, Offering]),
    LessonModule,
    SqsModule,
  ],
  controllers: [
    SchoolTermController,
    SchoolTermStudentController,
    SchoolTermSamController,
    SchoolTermComboController,
    SchoolTermLessonController,
    SchoolTermOfferingController,
  ],
  providers: [
    SchoolTermService,
    SchoolTermStudentService,
    SchoolTermSamService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermOfferingService,
  ],
  exports: [
    SchoolTermService,
    SchoolTermStudentService,
    SchoolTermSamService,
    SchoolTermComboService,
    SchoolTermLessonService,
    SchoolTermOfferingService,
  ],
})
export class SchoolTermModule {}
