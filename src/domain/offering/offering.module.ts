import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingPickController } from 'src/domain/offering/offering-pick.controller';
import { OfferingPickService } from 'src/domain/offering/offering-pick.service';
import { OfferingController } from 'src/domain/offering/offering.controller';
import { OfferingService } from 'src/domain/offering/offering.service';
import { School } from 'src/domain/school/entities/school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Offering, Booking, Pick, School])],
  providers: [OfferingService, OfferingPickService],
  controllers: [OfferingController, OfferingPickController],
})
export class OfferingModule {}
