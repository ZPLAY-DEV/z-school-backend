import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from 'src/domain/school/entities/school.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayController } from 'src/domain/schoolday/schoolday.controller';
import { SchooldayService } from 'src/domain/schoolday/schoolday.service';

@Module({
  imports: [TypeOrmModule.forFeature([School, Schoolday])],
  providers: [SchooldayService],
  controllers: [SchooldayController],
})
export class SchooldayModule {}
