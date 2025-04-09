import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from 'src/domain/term/entities/term.entity';
import { TermController } from 'src/domain/term/term.controller';
import { TermService } from 'src/domain/term/term.service';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Term]), UploadModule, S3Module],
  providers: [TermService],
  controllers: [TermController],
})
export class TermModule {}
