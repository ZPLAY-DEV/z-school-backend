import { Module } from '@nestjs/common';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadService } from './upload.service';

@Module({
  imports: [S3Module],
  exports: [UploadService],
  providers: [UploadService],
})
export class UploadModule {}
