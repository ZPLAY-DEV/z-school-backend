import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { Pick } from '../pick/entities/pick.entity';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parent, Student, Pick, Booking]),
    UploadModule,
    S3Module,
  ],
  exports: [StudentService],
  providers: [StudentService],
  controllers: [StudentController],
})
export class StudentModule {}
