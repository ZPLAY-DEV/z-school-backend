import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  CreateAttendanceWithGroupStudentDto,
  CreateAttendanceWithKeyDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceWithNextStop,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import {
  CustomAttendanceDocs,
  EndAttendanceDocs,
  FindAttendanceByDateWithExtendedDataDocs,
  GetReportDocs,
  GetStudentMonthlyReportDocs,
  StartAttendanceDocs,
  UpsertAttendanceDocs,
} from 'src/domain/group/swagger/group-attendance-swagger.decorator';

@ApiTags('✳️ Groups > Attendance ( 반 > 출석부 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupAttendanceController {
  constructor(
    private readonly groupAttendancesService: GroupAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create/Upsert
  //? ---------------------------------------------------------------------- ?//

  @StartAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/start')
  async start(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    return await this.groupAttendancesService.notifyStart(groupId, dtos);
  }

  @EndAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/end')
  async end(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    return await this.groupAttendancesService.notifyEnd(groupId, dtos);
  }

  @CustomAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/custom')
  async custom(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dtos: CreateAttendanceWithKeyDto[],
  ): Promise<number> {
    return await this.groupAttendancesService.notifyCustom(groupId, dtos);
  }

  //! assumed each day has only one class by the groupId
  @UpsertAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/:date/students/:studentId')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreateAttendanceWithGroupStudentDto,
  ): Promise<IAttendance> {
    return await this.groupAttendancesService.upsert(date, {
      ...dto,
      groupId,
      studentId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindAttendanceByDateWithExtendedDataDocs()
  @Get(':groupId/attendances/:date/extended')
  async findByDateWithExtendedData(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
  ): Promise<IAttendanceWithNextStop[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.findAttendancesByDateWithExtendedData(
      groupKey,
      date,
    );
  }

  @GetReportDocs()
  @Get(':groupId/attendances/:month/report')
  async getMonthlyReport(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('month') month: string,
  ): Promise<AttendanceReport[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.getMonthlyReport(groupKey, month);
  }

  // schooldays 는 그날 수 없이 있냐 없냐.
  // 학생별 출석자료 source of truth 는 dynamodb.
  @GetReportDocs()
  @Get(':groupId/attendances/:month/report/excel')
  async getMonthlyReportExcel(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const groupKey = generateGroupKey(groupId);
    const workbook = await this.groupAttendancesService.generateExcel(
      groupKey,
      month,
    );

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${month}-attendance-report.xlsx"`,
    );

    // 엑셀 파일을 response stream으로 작성
    await workbook.xlsx.write(res);
    res.end();
  }

  @GetStudentMonthlyReportDocs()
  @Get(':groupId/attendances/:month/students/:studentId')
  async getStudentMonthlyReport(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('month') month: string,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<IAttendance[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.getStudentMonthlyReport(
      groupKey,
      month,
      studentId,
    );
  }
}
