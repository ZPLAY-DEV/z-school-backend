import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonController } from 'src/domain/lesson/lesson.controller';
import { LessonService } from 'src/domain/lesson/lesson.service';
import { User } from 'src/domain/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Lesson, InstructorLesson])],
  providers: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
