import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingPickController } from 'src/domain/offering/offering-pick.controller';
import { OfferingPickService } from 'src/domain/offering/offering-pick.service';
import { OfferingController } from 'src/domain/offering/offering.controller';
import { OfferingService } from 'src/domain/offering/offering.service';
import { OfferingSubscriber } from 'src/domain/offering/subscriber/offering.subscriber';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Group,
      Lesson,
      Offering,
      Pick,
      Student,
      Term,
    ]),
  ],
  providers: [OfferingService, OfferingPickService, OfferingSubscriber],
  controllers: [OfferingController, OfferingPickController],
})
export class OfferingModule {}
