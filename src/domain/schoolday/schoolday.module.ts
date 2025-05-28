import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from 'src/domain/attendance/attendance.module';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayAttendanceController } from 'src/domain/schoolday/schoolday-attendance.controller';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { SchooldayController } from 'src/domain/schoolday/schoolday.controller';
import { SchooldayService } from 'src/domain/schoolday/schoolday.service';
import { DynamoModule } from 'src/services/aws/dynamo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Schoolday]),
    AttendanceModule,
    DynamoModule,
  ],
  providers: [SchooldayService, SchooldayAttendanceService],
  controllers: [SchooldayController, SchooldayAttendanceController],
})
export class SchooldayModule {}
