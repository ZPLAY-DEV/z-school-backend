import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from 'src/domain/term/entities/term.entity';
import { TermSubscriber } from 'src/domain/term/subscriber/term.subscriber';
import { TermController } from 'src/domain/term/term.controller';
import { TermService } from 'src/domain/term/term.service';
import { S3Module } from 'src/services/aws/s3.module';
import { SlackModule } from 'src/services/slack/slack-module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Term]),
    UploadModule,
    SlackModule,
    S3Module,
  ],
  providers: [TermService, TermSubscriber],
  controllers: [TermController],
})
export class TermModule {}
