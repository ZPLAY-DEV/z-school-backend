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
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import {
  FindAttendanceByDateDocs,
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
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @UpsertAttendanceDocs()
  @Post(':groupId/attendances/:date/students/:studentId')
  async upsert(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('date') date: string,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateAttendanceDto,
  ): Promise<void> {
    return await this.groupAttendancesService.upsert(
      groupId,
      date,
      studentId,
      dto,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? FIND BY DATE
  //? ---------------------------------------------------------------------- ?//

  @FindAttendanceByDateDocs()
  @Get(':groupId/attendances/:date')
  async findByDate(
    @Param('groupId', ParseIntPipe) groupId: string,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    const groupKey = `GROUP#${groupId}`;
    return await this.groupAttendancesService.findByDate(groupKey, date);
  }
}
