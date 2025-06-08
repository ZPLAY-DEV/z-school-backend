import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamooseModule } from 'nestjs-dynamoose';
import { AttendanceController } from 'src/domain/attendance/attendance.controller';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { AttendanceSchema } from 'src/domain/attendance/entities/attendance.schema';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { S3Module } from 'src/services/aws/s3.module';
import { NotificationModule } from 'src/services/notification/notification.module';

//! With correct module configuration, the local dynamoDB is populated automatically
//! as soon as executing any creation method.
@Module({
  imports: [
    TypeOrmModule.forFeature([Schoolday, Group, Student]),
    DynamooseModule.forFeature([
      {
        name: 'Attendance',
        schema: AttendanceSchema,
        options: {
          tableName: 'attendance', // e.g. local_attendance_table
        },
      },
    ]),
    S3Module,
    NotificationModule,
  ],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
