import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Cursor } from 'src/common/decorators/cursor.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { DynamoResponse } from 'src/common/interfaces';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
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
  FetchAttendanceDocs,
  UpsertAttendanceDocs,
} from 'src/domain/attendance/swagger/attendance-swagger.decorator';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';

@ApiTags('✳️ Attendances ( 출석 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('attendances')
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(private readonly attendancesService: AttendanceService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '⚙️ to initialize table' })
  @HttpCode(200)
  @Post('init')
  async init(): Promise<void> {
    await this.attendancesService.init();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FetchAttendanceDocs()
  @Public()
  @Get()
  async getByGroupId(
    @Query('groupId') groupId?: number,
    @Cursor() lastKey?: IAttendanceKey,
    @Query('count') count?: number,
  ): Promise<DynamoResponse<IAttendance>> {
    try {
      let result: DynamoResponse<IAttendance>;

      if (groupId) {
        // 특정 그룹 조회
        const groupKey = generateGroupKey(groupId);
        result = await this.attendancesService.queryByGroupKey(
          groupKey,
          lastKey,
          count,
        );
      } else {
        // 전체 스캔 (청크 크기 20 또는 지정된 개수)
        result = await this.attendancesService.scanAll(lastKey, count);
      }

      this.logger.log(
        `Fetched ${result.count} items, hasMore: ${result.hasMore}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch attendance records', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `출석 목록 조회에 실패했습니다: ${error.message}`,
      );
    }
  }

  @Public()
  @Get('keys')
  async batchGetByIdWithRangeKeys(
    @Query('groupId') groupId: number,
    @Query('keys') rangeKeys: string,
  ): Promise<IAttendance[]> {
    try {
      // rangeKeys를 쉼표로 구분된 문자열에서 배열로 변환
      const rangeKeysArray = rangeKeys ? rangeKeys.split(',') : [];
      const result = await this.attendancesService.batchGetByIdWithRangeKeys(
        groupId,
        rangeKeysArray,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch attendance records by keys', error);
      throw new BadRequestException(
        `출석 목록 조회에 실패했습니다: ${error.message}`,
      );
    }
  }

  @Public()
  @Get('students')
  async batchGetByIdWithUserId(
    @Query('groupId') groupId: number,
    @Query('studentId') studentId: number,
  ): Promise<IAttendance[]> {
    try {
      const result = await this.attendancesService.batchGetByIdWithUserId(
        groupId,
        studentId,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch attendance records by keys', error);
      throw new BadRequestException(
        `출석 목록 조회에 실패했습니다: ${error.message}`,
      );
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpsertAttendanceDocs()
  @Put()
  async upsert(@Body() dto: UpsertAttendanceDto): Promise<{ message: string }> {
    try {
      this.logger.log(
        `Upserting attendance w/ groupKey: ${dto.groupKey}, dailyStudentKey: ${dto.dailyStudentKey}`,
      );

      await this.attendancesService.upsert(dto);

      return {
        message: 'upsert attendance success',
      };
    } catch (error) {
      this.logger.error('Failed to upsert attendance record', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to upsert attendance: ${error.message}`,
      );
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @DeleteAttendanceDocs()
  @Delete()
  async delete(@Body() dto: AttendanceKeyDto): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting attendance: ${JSON.stringify(dto)}`);

      await this.attendancesService.delete(dto);

      return {
        message: '출석 기록이 성공적으로 삭제되었습니다.',
      };
    } catch (error) {
      this.logger.error('Failed to delete attendance record', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `출석 기록 삭제에 실패했습니다: ${error.message}`,
      );
    }
  }
}
