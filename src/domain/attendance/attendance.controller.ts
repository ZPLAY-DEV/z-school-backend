import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendancesService: AttendanceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Attendance 생성' })
  @Post()
  async create(
    @Body() createAttendanceDto: CreateAttendanceDto,
  ): Promise<IAttendance> {
    return await this.attendancesService.create(createAttendanceDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Attendance 리스트' })
  @Get()
  async fetch(
    @Query('date') groupKey: string,
    @Query('lastDailyStudentKey') lastDailyStudentKey?: string,
  ): Promise<any> {
    const lastKey = lastDailyStudentKey
      ? { groupKey, dailyStudentKey: lastDailyStudentKey }
      : null;
    const res = await this.attendancesService.fetch(groupKey, lastKey);
    return {
      lastKey: res.lastKey,
      count: res.count,
      items: res,
    };
  }

  @ApiOperation({ description: 'Attendance 상세보기' })
  @Get(':groupKey/:dailyStudentKey')
  async getAttendanceById(
    @Param('groupKey') groupKey: string,
    @Param('dailyStudentKey') dailyStudentKey: string,
  ): Promise<IAttendance> {
    return await this.attendancesService.findById({
      groupKey,
      dailyStudentKey,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? FIND BY DATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: '특정 날짜의 Attendance 리스트' })
  @Get('by-date')
  async findByDate(
    @Query('groupKey') groupKey: string,
    @Query('date') date: string,
  ): Promise<IAttendance[]> {
    return await this.attendancesService.findByDate(groupKey, date);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @Patch(':groupKey/:dailyStudentKey/read')
  async markAsRead(
    @Param('groupKey') groupKey: string,
    @Param('dailyStudentKey') dailyStudentKey: string,
  ): Promise<any> {
    await this.attendancesService.markAsRead({ groupKey, dailyStudentKey });
    return { data: 'ok' };
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Attendance 삭제' })
  @Delete(':groupKey/:dailyStudentKey')
  async delete(
    @Param('groupKey') groupKey: string,
    @Param('dailyStudentKey') dailyStudentKey: string,
  ): Promise<any> {
    await this.attendancesService.delete({ groupKey, dailyStudentKey });
    return { data: 'ok' };
  }
}
