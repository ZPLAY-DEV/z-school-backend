import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ParentController } from 'src/domain/parent/parent.controller';
import { ParentService } from 'src/domain/parent/parent.service';
import { S3Module } from 'src/services/aws/s3.module';
import { SlackModule } from 'src/services/slack/slack-module';

@Module({
  imports: [TypeOrmModule.forFeature([Parent]), S3Module, SlackModule],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
