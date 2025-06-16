import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SlackModule } from 'src/services/slack/slack.module';
import { UploadModule } from 'src/services/upload/upload.module';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instructor, Group, Sam]),
    UploadModule,
    SlackModule,
  ],
  controllers: [InstructorController],
  providers: [InstructorService],
})
export class InstructorModule {}
