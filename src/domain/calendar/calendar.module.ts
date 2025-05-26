import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from 'src/domain/calendar/calendar.controller';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Calendar])],
  exports: [CalendarService],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
