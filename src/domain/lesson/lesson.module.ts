import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Category } from 'src/domain/category/entities/category.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonController } from 'src/domain/lesson/lesson.controller';
import { LessonService } from 'src/domain/lesson/lesson.service';
import { LessonSubscriber } from 'src/domain/lesson/subscriber/lesson.subscriber';
import { School } from 'src/domain/school/entities/school.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { LessonCoreService } from './lesson-core.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, School, Group, Term, Calendar, Category]),
  ],
  providers: [LessonService, LessonCoreService, LessonSubscriber],
  controllers: [LessonController],
  exports: [LessonService, LessonCoreService],
})
export class LessonModule {}
