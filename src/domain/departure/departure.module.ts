import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartureController } from './departure.controller';
import { DepartureService } from './departure.service';
import { Departure } from './entities/departure.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Departure])],
  controllers: [DepartureController],
  providers: [DepartureService],
  exports: [DepartureService],
})
export class DepartureModule {}
