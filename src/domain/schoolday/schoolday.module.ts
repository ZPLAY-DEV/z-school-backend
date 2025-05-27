import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceController } from 'src/domain/schoolday/schoolday-attendance.controller';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { SchooldayController } from 'src/domain/schoolday/schoolday.controller';
import { SchooldayService } from 'src/domain/schoolday/schoolday.service';

@Module({
  imports: [TypeOrmModule.forFeature([School, Schoolday])],
  providers: [SchooldayService, SchooldayAttendanceService],
  controllers: [SchooldayController, SchooldayAttendanceController],
})
export class SchooldayModule {}
