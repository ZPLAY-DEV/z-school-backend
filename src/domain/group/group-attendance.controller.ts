import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { GroupAttendanceService } from 'src/domain/group/group-attendance.service';

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

  @ApiOperation({ description: '특정 날짜의 Attendance 리스트' })
  @Get(':groupId/attendances/:date')
  async findByDate(
    @Param('groupId') groupId: string,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    const groupKey = `GROUP#${groupId}`;
    return await this.groupAttendancesService.findByDate(groupKey, date);
  }
}
