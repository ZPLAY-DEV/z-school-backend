import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from 'src/domain/calendar/calendar.module';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceController } from 'src/domain/schoolday/schoolday-attendance.controller';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { SchooldayController } from 'src/domain/schoolday/schoolday.controller';
import { SchooldayService } from 'src/domain/schoolday/schoolday.service';
import { SchooldaySubscriber } from 'src/domain/schoolday/subscriber/schoolday.subscriber';
import { Term } from 'src/domain/term/entities/term.entity';
import { DynamoModule } from 'src/services/aws/dynamo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Term, Schoolday]),
    CalendarModule,
    DynamoModule, // to call dynamoDB directly
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
