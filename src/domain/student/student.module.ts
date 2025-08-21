import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { UploadModule } from 'src/services/upload/upload.module';
import { Booking } from '../booking/entities/booking.entity';
import { Group } from '../group/entities/group.entity';
import { Pick } from '../pick/entities/pick.entity';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parent, Student, Pick, Booking, Group, Term]),
    DynamooseModule.forFeature([
      {
        name: 'Attendance',
        schema: AttendanceSchema,
        options: {
          tableName: 'attendance', // e.g. dev_attendance_table
        },
      },
    ]),
    UploadModule,
    S3Module,
  ],
  providers: [StudentService],
  controllers: [StudentController],
})
export class StudentModule {}
