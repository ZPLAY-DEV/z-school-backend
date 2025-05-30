import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';
import { FindAttendanceByDateDocs } from 'src/domain/group/swagger/group-attendance-swagger.decorator';

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

  //? ---------------------------------------------------------------------- ?//
  //? FIND BY DATE
  //? ---------------------------------------------------------------------- ?//

  @FindAttendanceByDateDocs()
  @Get(':groupId/attendances/:date')
  async findByDate(
    @Param('groupId') groupId: string,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    const groupKey = `GROUP#${groupId}`;
    return await this.groupAttendancesService.findByDate(groupKey, date);
  }
}
