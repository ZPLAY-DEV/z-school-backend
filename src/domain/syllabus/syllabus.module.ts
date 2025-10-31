import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curriculum } from '../curriculum/entities/curriculum.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Syllabus } from './entities/syllabus.entity';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';

@Module({
  imports: [TypeOrmModule.forFeature([Syllabus, Curriculum, Lesson])],
  controllers: [SyllabusController],
  providers: [SyllabusService],
  exports: [SyllabusService],
})
export class SyllabusModule {}
