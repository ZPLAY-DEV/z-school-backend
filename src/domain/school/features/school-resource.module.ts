import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Letter } from 'src/domain/letter/entities/letter.entity';
import { Document } from 'src/domain/document/entities/document.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { SchoolLetterController } from 'src/domain/school/school-letter.controller';
import { SchoolLetterService } from 'src/domain/school/school-letter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Letter, Document, Instructor])],
  controllers: [SchoolLetterController],
  providers: [SchoolLetterService],
  exports: [SchoolLetterService],
})
export class SchoolResourceModule {} 