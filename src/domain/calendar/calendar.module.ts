import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from 'src/domain/calendar/calendar.controller';
import { CalendarService } from 'src/domain/calendar/calendar.service';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { NeisModule } from 'src/services/neis/neis-module';

@Module({
  imports: [TypeOrmModule.forFeature([School, Calendar]), NeisModule],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
