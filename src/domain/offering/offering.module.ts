import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offering } from 'src/domain/term/entities/term.entity';
import { OfferingController } from 'src/domain/term/term.controller';
import { OfferingService } from 'src/domain/term/term.service';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Offering]), UploadModule, S3Module],
  providers: [OfferingService],
  controllers: [OfferingController],
})
export class OfferingModule {}
