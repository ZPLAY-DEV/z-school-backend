import { Module } from '@nestjs/common';
import { SchoolBoardModule } from 'src/domain/school/features/school-board.module';
import { SchoolCoreModule } from 'src/domain/school/features/school-core.module';
import { SchoolResourceModule } from 'src/domain/school/features/school-resource.module';
import { SchoolStudentModule } from 'src/domain/school/features/school-student.module';
import { SchoolTermModule } from 'src/domain/school/features/school-term.module';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    SchoolCoreModule,
    SchoolTermModule,
    SchoolStudentModule,
    SchoolBoardModule,
    SchoolResourceModule,
    UploadModule,
    S3Module,
  ],
  exports: [
    SchoolCoreModule,
    SchoolTermModule,
    SchoolStudentModule,
    SchoolBoardModule,
    SchoolResourceModule,
  ],
})
export class SchoolModule {}
