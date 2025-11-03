import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { Week } from './entities/week.entity';
import { WeekController } from './week.controller';
import { WeekService } from './week.service';

@Module({
  imports: [TypeOrmModule.forFeature([Week, Syllabus])],
  controllers: [WeekController],
  providers: [WeekService],
  exports: [WeekService],
})
export class WeekModule {}
