import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingPickController } from 'src/domain/offering/offering-pick.controller';
import { OfferingPickService } from 'src/domain/offering/offering-pick.service';
import { OfferingController } from 'src/domain/offering/offering.controller';
import { OfferingService } from 'src/domain/offering/offering.service';

@Module({
  imports: [TypeOrmModule.forFeature([Offering, Booking, Pick, Group, Lesson])],
  providers: [OfferingService, OfferingPickService],
  controllers: [OfferingController, OfferingPickController],
})
export class OfferingModule {}
