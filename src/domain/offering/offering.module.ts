import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingGroupStudentController } from 'src/domain/offering/offering-group-student.controller';
import { OfferingGroupStudentService } from 'src/domain/offering/offering-group-student.service';
import { OfferingController } from 'src/domain/offering/offering.controller';
import { OfferingService } from 'src/domain/offering/offering.service';
import { School } from 'src/domain/school/entities/school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offering, Booking, GroupStudent, School]),
  ],
  providers: [OfferingService, OfferingGroupStudentService],
  controllers: [OfferingController, OfferingGroupStudentController],
})
export class OfferingModule {}
