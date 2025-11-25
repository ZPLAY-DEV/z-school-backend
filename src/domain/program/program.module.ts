import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadModule } from 'src/services/upload/upload.module';
import { Syllabus } from '../syllabus/entities/syllabus.entity';
import { Week } from '../week/entities/week.entity';
import { Program } from './entities/program.entity';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

@Module({
  imports: [TypeOrmModule.forFeature([Program, Week, Syllabus]), UploadModule],
  controllers: [ProgramController],
  providers: [ProgramService],
  exports: [ProgramService],
})
export class ProgramModule {}
