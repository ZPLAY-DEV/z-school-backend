import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Student } from 'src/domain/student/entities/student.entity';
import { NotificationModule } from 'src/services/notification/notification.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Departure,
      Group,
      Offering,
      Pick,
      Presence,
      Schoolday,
      Score,
      Student,
    ]),
    NotificationModule,
    UploadModule,
  ],
  providers: [
    GroupService,
    // GroupAttendanceService,
    GroupSchooldayService,
    GroupScoreService,
    GroupPresenceService,
  ],
  controllers: [
    GroupController,
    // GroupAttendanceController,
    GroupSchooldayController,
    GroupScoreController,
    GroupPresenceController,
  ],
  exports: [GroupScoreService],
})
export class GroupModule {}
