import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { CreateAttendanceDto } from 'src/domain/attendance/dto/create-attendance.dto';
import {
  AttendanceKeyDto,
  UpdateAttendanceDto,
} from 'src/domain/attendance/dto/update-attendance.dto';
import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';

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
    @Query('groupId') groupId: string,
    @Query('cursor') cursor?: string,
  ): Promise<any> {
    if (!groupId) {
      throw new BadRequestException(HttpErrorConstants.INVALID_QUERY_PARAMS);
    }

    // groupId를 groupKey로 변환 (PREFIX 추가)
    const groupKey = `GROUP#${groupId}`;

    // cursor를 lastKey로 디코딩
    let lastKey: IAttendanceKey | undefined = undefined;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorData = JSON.parse(decoded);
        lastKey = {
          groupKey: cursorData.groupKey,
          dailyStudentKey: cursorData.dailyStudentKey,
        };
      } catch {
        throw new BadRequestException('Invalid cursor format');
      }
    }

    const res = await this.attendancesService.fetch(groupKey, lastKey);

    // nextCursor 생성
    let nextCursor: string | undefined = undefined;
    if (res.lastKey) {
      const cursorData = {
        groupKey: res.lastKey.groupKey,
        dailyStudentKey: res.lastKey.dailyStudentKey,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      items: res.items,
      count: res.count,
      nextCursor,
      hasMore: !!res.lastKey,
    };
  }

  @ApiOperation({ description: 'Attendance 상세보기' })
  @Get()
  async getAttendanceById(
    @Query('groupId') groupId: string,
    @Query('date') date: string,
    @Query('studentId') studentId: string,
  ): Promise<IAttendance> {
    const groupKey = `GROUP#${groupId}`;
    const dailyStudentKey = `DATE#${date}#STUDENT#${studentId}`;
    return await this.attendancesService.findById({
      groupKey,
      dailyStudentKey,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Attendance 상태변경' })
  @Patch()
  async update(@Body() dto: UpdateAttendanceDto): Promise<IAttendance> {
    const { groupKey, dailyStudentKey } = dto;
    return await this.attendancesService.update({ groupKey, dailyStudentKey });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Attendance 삭제' })
  @Delete()
  async delete(@Body() dto: AttendanceKeyDto): Promise<void> {
    await this.attendancesService.delete(dto);
  }
}
