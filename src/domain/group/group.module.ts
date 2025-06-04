import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupAttendanceController } from 'src/domain/group/group-attendance.controller';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickController } from 'src/domain/pick/pick.controller';
import { PickService } from 'src/domain/pick/pick.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Group, Pick, Student]),
    DynamooseModule.forFeature([
      {
        name: 'Attendance',
        schema: AttendanceSchema,
        options: {
          tableName: 'attendance', // e.g. local_attendance_table
        },
      },
    ]),
  ],
  providers: [GroupService, GroupAttendanceService, PickService],
  controllers: [GroupController, GroupAttendanceController, PickController],
})
export class GroupModule {}
