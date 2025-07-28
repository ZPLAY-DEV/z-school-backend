import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { SchoolSamController } from 'src/domain/school/school-sam.controller';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { SchoolStudentController } from 'src/domain/school/school-student.controller';
import { SchoolStudentService } from 'src/domain/school/school-student.service';
import { Student } from 'src/domain/student/entities/student.entity';
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, School, Parent, Pick, Sam]),
    UploadModule,
  ],
  controllers: [SchoolStudentController, SchoolSamController],
  providers: [SchoolStudentService, SchoolSamService],
  exports: [SchoolStudentService, SchoolSamService],
})
export class SchoolStudentModule {}
