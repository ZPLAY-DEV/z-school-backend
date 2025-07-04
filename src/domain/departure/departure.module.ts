import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { NotificationModule } from 'src/services/notification/notification.module';
import { DepartureController } from './departure.controller';
import { DepartureService } from './departure.service';
import { Departure } from './entities/departure.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Departure, Student, Schoolday]),
    NotificationModule,
  ],
  controllers: [DepartureController],
  providers: [DepartureService],
  exports: [DepartureService],
})
export class DepartureModule {}
