import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { UpdateAttendanceDto } from 'src/domain/attendance/dto/update-attendance.dto';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { AttendanceReport } from 'src/domain/attendance/types/attendance.types';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import {
  FindAttendanceByDateDocs,
  GetReportDocs,
  UpsertAttendanceDocs,
} from 'src/domain/group/swagger/group-attendance-swagger.decorator';

@ApiTags('✅ Groups > Attendance ( 반 > 출석부 조회 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupAttendanceController {
  constructor(
    private readonly groupAttendancesService: GroupAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Upsert
  //? ---------------------------------------------------------------------- ?//

  @UpsertAttendanceDocs()
  @Post(':groupId/attendances/:date/students/:studentId')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateAttendanceDto,
  ): Promise<IAttendance> {
    return await this.groupAttendancesService.upsert(
      groupId,
      date,
      studentId,
      dto,
    );
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
    return await this.groupAttendancesService.findByDate(groupKey, date);
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
