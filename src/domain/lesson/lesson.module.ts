import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonController } from 'src/domain/lesson/lesson.controller';
import { LessonService } from 'src/domain/lesson/lesson.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  providers: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
