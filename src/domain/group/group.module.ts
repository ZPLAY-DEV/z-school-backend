import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupAttendanceController } from 'src/domain/group/group-attendance.controller';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import { GroupSchooldayController } from 'src/domain/group/group-schoolday.controller';
import { GroupSchooldayService } from 'src/domain/group/group-schoolday.service';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { NotificationModule } from 'src/services/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      Student,
      Booking,
      Pick,
      Schoolday,
      Departure,
      Offering,
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
    NotificationModule,
  ],
  providers: [GroupService, GroupAttendanceService, GroupSchooldayService],
  controllers: [
    GroupController,
    GroupAttendanceController,
    GroupSchooldayController,
  ],
})
export class GroupModule {}
