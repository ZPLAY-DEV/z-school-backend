import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Departure } from 'src/domain/departure/entities/departure.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupPresenceController } from 'src/domain/group/group-presence.controller';
import { GroupPresenceService } from 'src/domain/group/group-presence.service';
import { GroupSchooldayController } from 'src/domain/group/group-schoolday.controller';
import { GroupSchooldayService } from 'src/domain/group/group-schoolday.service';
import { GroupScoreController } from 'src/domain/group/group-score.controller';
import { GroupScoreService } from 'src/domain/group/group-score.service';
import { GroupController } from 'src/domain/group/group.controller';
import { GroupService } from 'src/domain/group/group.service';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Presence } from 'src/domain/presence/entities/presence.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Score } from 'src/domain/score/entities/score.entity';
import { ScoreModule } from 'src/domain/score/score.module';
import { Student } from 'src/domain/student/entities/student.entity';
import { NotificationModule } from 'src/services/notification/notification.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      Student,
      Booking,
      Pick,
      Schoolday,
      Score,
      Departure,
      Offering,
      Presence,
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
    UploadModule,
    ScoreModule,
  ],
  providers: [
    GroupService,
    GroupScoreService,
    // GroupAttendanceService,
    GroupSchooldayService,
    GroupPresenceService,
  ],
  controllers: [
    GroupController,
    GroupScoreController,
    // GroupAttendanceController,
    GroupSchooldayController,
    GroupPresenceController,
  ],
})
export class GroupModule {}
