import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import { LessonAttendanceService } from 'src/domain/lesson/lesson-attendance.service';
import {
  FindAttendanceByDateDocs,
  GetReportDocs,
} from 'src/domain/lesson/swagger/lesson-attendance-swagger.decorator';

@ApiTags('✳️ Lessons > Attendance ( 과목 > 출석부 조회 )')
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
  @Get(':lessonId/attendances/:date/extended')
  async findExtendedAttendancesByDate(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('date') date: string, //! "2025-06-06"
  ): Promise<IAttendance[]> {
    return await this.lessonAttendancesService.findExtendedAttendancesByDate(
      lessonId,
      date,
    );
  }

  @GetReportDocs()
  @Get(':lessonId/attendances/:month/report')
  async getMonthlyReport(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('month') month: string,
  ): Promise<AttendanceReport[]> {
    return await this.lessonAttendancesService.getMonthlyReport(
      lessonId,
      month,
    );
  }

  // schooldays 는 그날 수업이 있나 없나 판단 근거.
  // 학생별 출석자료 source of truth 는 dynamodb.
  @GetReportDocs()
  @Get(':lessonId/attendances/:month/report/download')
  async downloadMonthlyReportExcel(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const workbook = await this.lessonAttendancesService.generateExcel(
      lessonId,
      month,
    );

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${month}-lesson-report.xlsx"`,
    );

    // 엑셀 파일을 response stream으로 작성
    await workbook.xlsx.write(res);
    res.end();
  }
}
