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
import { ApiTags } from '@nestjs/swagger';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import { CreateWithStudentAndSchooldayDto } from 'src/domain/attendance/dto/create-with-student-and-schoolday.dto';
import {
  AttendanceKeyDto,
  UpsertAttendanceDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';

import {
  IAttendance,
  IAttendanceKey,
} from 'src/domain/attendance/entities/attendance.interface';
import {
  DeleteAttendanceDocs,
  FetchAttendancesDocs,
  GetAttendanceDetailDocs,
  UpsertAttendanceBareDocs,
  UpsertWithStudentAndSchooldayDocs,
} from 'src/domain/attendance/swagger/attendance-swagger.decorator';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';

@ApiTags('✅ Attendances ( 출석 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendancesService: AttendanceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE / UPDATE (Upsert - DynamoDB Style)
  //? ---------------------------------------------------------------------- ?//

  @UpsertWithStudentAndSchooldayDocs()
  @HttpCode(200)
  @Post()
  async upsertWithStudentAndSchoolday(
    @Body()
    dto: CreateWithStudentAndSchooldayDto,
  ): Promise<IAttendance> {
    return await this.attendancesService.upsertWithStudentAndSchoolday(dto);
  }

  @UpsertAttendanceBareDocs()
  @HttpCode(200)
  @Post('bare')
  async upsert(@Body() dto: UpsertAttendanceDto): Promise<IAttendance> {
    return await this.attendancesService.upsert(dto);
  }

  @HttpCode(200)
  @Post('notify')
  async notifyParents(): Promise<any> {
    return await this.attendancesService.notifyParents();
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FetchAttendancesDocs()
  @Get()
  async fetch(
    @Query('groupId', ParseIntPipe) groupId: number,
    @Query('cursor') cursor?: string,
  ): Promise<any> {
    if (!groupId) {
      throw new BadRequestException(HttpErrorConstants.INVALID_QUERY_PARAMS);
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

  @GetAttendanceDetailDocs()
  @Get('detail')
  async getAttendanceById(
    @Query('groupId', ParseIntPipe) groupId: number,
    @Query('date') date: string,
    @Query('studentId', ParseIntPipe) studentId: number,
  ): Promise<IAttendance> {
    const groupKey = generateGroupKey(groupId);
    const dailyStudentKey = `DATE#${date}#STUDENT#${studentId}`;
    return await this.attendancesService.findById({
      groupKey,
      dailyStudentKey,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @DeleteAttendanceDocs()
  @Delete()
  async delete(@Body() dto: AttendanceKeyDto): Promise<void> {
    await this.attendancesService.delete(dto);
  }
}
