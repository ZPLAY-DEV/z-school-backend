import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Syllabus } from 'src/domain/syllabus/entities/syllabus.entity';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { Curriculum } from './entities/curriculum.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Curriculum, Lesson, Syllabus])],
  controllers: [CurriculumController],
  providers: [CurriculumService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
