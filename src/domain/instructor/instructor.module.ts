import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Instructor]), UploadModule, SlackModule],
  controllers: [InstructorController],
  providers: [InstructorService],
})
export class InstructorModule {}
