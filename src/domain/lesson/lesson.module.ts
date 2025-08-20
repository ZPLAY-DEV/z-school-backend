import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { Category } from 'src/domain/category/entities/category.entity';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonAttendanceController } from 'src/domain/lesson/lesson-attendance.controller';
import { LessonAttendanceService } from 'src/domain/lesson/lesson-attendance.service';
import { LessonCoreService } from 'src/domain/lesson/lesson-core.service';
import { LessonController } from 'src/domain/lesson/lesson.controller';
import { LessonService } from 'src/domain/lesson/lesson.service';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Departure,
      Group,
      Lesson,
      Pick,
      School,
      Schoolday,
      Student,
      Term,
    ]),
    DynamooseModule.forFeature([
      {
        name: 'Attendance',
        schema: AttendanceSchema,
        options: {
          tableName: 'attendance', // e.g. local_attendance_table
        },
      },
    ]),
    CalendarModule,
  ],
  providers: [LessonService, LessonCoreService, LessonAttendanceService],
  controllers: [LessonController, LessonAttendanceController],
  exports: [LessonService, LessonCoreService],
})
export class LessonModule {}
