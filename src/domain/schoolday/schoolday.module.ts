import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from 'src/domain/attendance/attendance.module';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceController } from 'src/domain/schoolday/schoolday-attendance.controller';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { SchooldayController } from 'src/domain/schoolday/schoolday.controller';
import { SchooldayService } from 'src/domain/schoolday/schoolday.service';
import { SchooldaySubscriber } from 'src/domain/schoolday/subscriber/schoolday.subscriber';
import { DynamoModule } from 'src/services/aws/dynamo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Schoolday]),
    AttendanceModule,
    CalendarModule,
    DynamoModule,
  ],
  providers: [
    SchooldayService,
    SchooldayAttendanceService,
    SchooldaySubscriber,
  ],
  controllers: [SchooldayController, SchooldayAttendanceController],
  exports: [SchooldayAttendanceService],
})
export class SchooldayModule {}
