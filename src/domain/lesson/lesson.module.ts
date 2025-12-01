import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { Category } from 'src/domain/category/entities/category.entity';
import { Curriculum } from 'src/domain/curriculum/entities/curriculum.entity';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonCoreService } from 'src/domain/lesson/lesson-core.service';
import { LessonController } from 'src/domain/lesson/lesson.controller';
import { LessonService } from 'src/domain/lesson/lesson.service';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import { Term } from 'src/domain/term/entities/term.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Category,
      Curriculum,
      Departure,
      Group,
      Lesson,
      Pick,
      School,
      Schoolday,
      Student,
      Syllabus,
      Term,
    ]),
    CalendarModule,
  ],
  providers: [LessonService, LessonCoreService],
  controllers: [LessonController],
  exports: [LessonService, LessonCoreService],
})
export class LessonModule {}
