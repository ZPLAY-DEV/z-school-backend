import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import { LessonAttendanceService } from 'src/domain/lesson/lesson-attendance.service';
import {
  FindAttendanceByDateDocs,
  GetReportDocs,
} from 'src/domain/lesson/swagger/lesson-attendance-swagger.decorator';

@ApiTags('✅ Lessons > Attendance ( 과목 > 출석부 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('lessons')
export class LessonAttendanceController {
  constructor(
    private readonly lessonAttendancesService: LessonAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindAttendanceByDateDocs()
  @Get(':lessonId/attendances/:date')
  async findByDate(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    return await this.lessonAttendancesService.findByDate(lessonId, date);
  }

  @GetReportDocs()
  @Get(':lessonId/attendances/:date/report')
  async getReport(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('date') date: string,
  ): Promise<AttendanceReport[]> {
    return await this.lessonAttendancesService.getReport(lessonId, date);
  }
}
