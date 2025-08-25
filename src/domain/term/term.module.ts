import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { TermSubscriber } from 'src/domain/term/subscriber/term.subscriber';
import { TermController } from 'src/domain/term/term.controller';
import { TermService } from 'src/domain/term/term.service';

@Module({
  imports: [TypeOrmModule.forFeature([Term, Lesson, School])],
  providers: [TermService, TermSubscriber],
  controllers: [TermController],
})
export class TermModule {}
