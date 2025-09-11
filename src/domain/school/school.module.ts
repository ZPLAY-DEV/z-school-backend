import { Module } from '@nestjs/common';
import { SchoolCoreModule } from 'src/domain/school/features/school-core.module';
import { SchoolStudentModule } from 'src/domain/school/features/school-student.module';
import { SchoolTermModule } from 'src/domain/school/features/school-term.module';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    SchoolCoreModule,
    SchoolTermModule,
    SchoolStudentModule,
    UploadModule,
    S3Module,
  ],
  exports: [SchoolCoreModule, SchoolTermModule, SchoolStudentModule],
})
export class SchoolModule {}
