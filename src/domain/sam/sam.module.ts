import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SamController } from 'src/domain/sam/sam.controller';
import { SamService } from 'src/domain/sam/sam.service';
import { SlackModule } from 'src/services/slack/slack.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sam, Group, Instructor]),
    UploadModule,
    SlackModule,
  ],
  controllers: [SamController],
  providers: [SamService],
})
export class SamModule {}
