import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import { AttendanceStatusDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
import {
  IAttendance,
  IAttendanceWithLastFlag,
} from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import {
  EndAttendanceDocs,
  FindAttendanceByDateDocs,
  FindAttendanceByDateWithExtendedDataDocs,
  GetReportDocs,
  StartAttendanceDocs,
  UpsertAttendanceDocs,
} from 'src/domain/group/swagger/group-attendance-swagger.decorator';

@ApiTags('✅ Groups > Attendance ( 반 > 출석부 조회 )')
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
    @Body() dtos: AttendanceStatusDto[],
  ): Promise<number> {
    return await this.groupAttendancesService.notifyStart(groupId, dtos);
  }

  @EndAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/end')
  async end(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dtos: AttendanceStatusDto[],
  ): Promise<number> {
    return await this.groupAttendancesService.notifyEnd(groupId, dtos);
  }

  //! assumed each day has only one class by the groupId
  @UpsertAttendanceDocs()
  @HttpCode(200)
  @Post(':groupId/attendances/:date/students/:studentId')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateAttendanceDto,
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

  @FindAttendanceByDateDocs()
  @Get(':groupId/attendances/:date')
  async findByDate(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.findAttendancesByDate(
      groupKey,
      date,
    );
  }

  @FindAttendanceByDateWithExtendedDataDocs()
  @Get(':groupId/attendances/:date/extended')
  async findByDateWithExtendedData(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
  ): Promise<IAttendanceWithLastFlag[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.findAttendancesByDateWithExtendedData(
      groupKey,
      date,
    );
  }

  @GetReportDocs()
  @Get(':groupId/attendances/:date/report')
  async getReport(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
  ): Promise<AttendanceReport[]> {
    const groupKey = generateGroupKey(groupId);
    return await this.groupAttendancesService.getReport(groupKey, date);
  }
}
