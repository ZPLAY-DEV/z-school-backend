import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickController } from 'src/domain/pick/pick.controller';
import { PickScoreController } from 'src/domain/pick/pick-score.controller';
import { PickScoreService } from 'src/domain/pick/pick-score.service';
import { PickService } from 'src/domain/pick/pick.service';
import { Score } from 'src/domain/score/entities/score.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Group, Pick, Score, Student, User]),
  ],
  providers: [PickService, PickScoreService],
  controllers: [PickController, PickScoreController],
})
export class PickModule {}
