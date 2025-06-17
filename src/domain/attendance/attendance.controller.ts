import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { AttendanceKeyDto } from 'src/domain/attendance/dto/upsert-attendance.dto';
import { IAttendanceKey } from 'src/domain/attendance/entities/attendance.interface';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';

@ApiTags('✅ Attendances ( 출석 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendancesService: AttendanceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '⚙️ to initialize table' })
  @HttpCode(200)
  @Post('init')
  async init(): Promise<void> {
    await this.attendancesService.init();
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '출석목록 (미사용)' })
  @Get()
  async fetch(
    @Query('groupId', ParseIntPipe) groupId: number,
    @Query('cursor') cursor?: string,
  ): Promise<any> {
    if (!groupId) {
      throw new BadRequestException('groupId is required');
    }
    const groupKey = generateGroupKey(groupId);

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

  // @ApiOperation({ summary: '출석상세 (미사용)' })
  // @Get('detail')
  // async getAttendanceById(
  //   @Query('groupId', ParseIntPipe) groupId: number,
  //   @Query('date') date: string,
  //   @Query('studentId', ParseIntPipe) studentId: number,
  // ): Promise<IAttendance> {
  //   const groupKey = generateGroupKey(groupId);
  //   const dailyStudentKey = `DATE#${date}#STUDENT#${studentId}`;
  //   return await this.attendancesService.findById({
  //     groupKey,
  //     dailyStudentKey,
  //   });
  // }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//
  @ApiOperation({ summary: '출석 삭제 (미사용)' })
  @Delete()
  async delete(@Body() dto: AttendanceKeyDto): Promise<void> {
    await this.attendancesService.delete(dto);
  }
}
