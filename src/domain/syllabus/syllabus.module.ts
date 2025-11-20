import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curriculum } from '../curriculum/entities/curriculum.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Program } from '../program/entities/program.entity';
import { Week } from '../week/entities/week.entity';
import { Syllabus } from './entities/syllabus.entity';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Syllabus, Curriculum, Lesson, Week, Program]),
    UploadModule,
  ],
  controllers: [SyllabusController],
  providers: [SyllabusService],
  exports: [SyllabusService],
})
export class SyllabusModule {}
