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
import { Public } from 'src/common/decorators/public.decorator';
import { AttendanceService } from 'src/domain/attendance/attendance.service';
import {
  AttendanceKeyDto,
  UpsertAttendanceDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';
import { IAttendanceKey } from 'src/domain/attendance/entities/attendance.interface';
import {
  DeleteAttendanceDocs,
  FetchAttendanceDocs,
  UpsertAttendanceDocs,
} from 'src/domain/attendance/swagger/attendance-swagger.decorator';
import { generateGroupKey } from 'src/domain/attendance/utils/attendance.utils';

interface FetchResponse {
  items: any[];
  count: number;
  nextCursor?: string;
  hasMore: boolean;
  totalScanned?: number;
}

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
  async fetch(
    @Query('groupId') groupId?: number,
    @Query('cursor') cursor?: string,
    @Query('count') count?: number,
  ): Promise<FetchResponse> {
    try {
      // Cursor를 lastKey로 안전하게 디코딩
      let lastKey: IAttendanceKey | undefined = undefined;
      if (cursor) {
        lastKey = this.decodeCursor(cursor);
      }

      let result: {
        items: any[];
        count: number;
        lastKey?: IAttendanceKey;
      };

      if (groupId) {
        // 특정 그룹 조회
        const groupKey = generateGroupKey(groupId);
        this.logger.log(`Fetching attendance for group: ${groupKey}`);
        result = await this.attendancesService.fetch(groupKey, lastKey, count);
      } else {
        // 전체 스캔 (청크 크기 20 또는 지정된 개수)
        this.logger.log('Scanning all attendance records');
        result = await this.attendancesService.scanAll(lastKey, count);
      }

      // nextCursor 생성
      const nextCursor = result.lastKey
        ? this.encodeCursor(result.lastKey)
        : undefined;

      const response: FetchResponse = {
        items: result.items,
        count: result.count,
        nextCursor,
        hasMore: !!result.lastKey,
      };

      // 전체 스캔인 경우 totalScanned 정보 추가
      if (!groupId) {
        response.totalScanned = result.count;
      }

      this.logger.log(
        `Fetched ${result.count} items, hasMore: ${!!result.lastKey}`,
      );
      return response;
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

  //? ---------------------------------------------------------------------- ?//
  //? PRIVATE HELPERS
  //? ---------------------------------------------------------------------- ?//

  private decodeCursor(cursor: string): IAttendanceKey {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorData = JSON.parse(decoded);

      if (!cursorData.groupKey || !cursorData.dailyStudentKey) {
        throw new Error('Invalid cursor structure');
      }

      return {
        groupKey: cursorData.groupKey,
        dailyStudentKey: cursorData.dailyStudentKey,
      };
    } catch (error) {
      this.logger.warn(`Invalid cursor format: ${cursor}`, error);
      throw new BadRequestException(
        '유효하지 않은 커서 형식입니다. 올바른 Base64 인코딩된 커서를 제공해주세요.',
      );
    }
  }

  private encodeCursor(lastKey: IAttendanceKey): string {
    try {
      const cursorData = {
        groupKey: lastKey.groupKey,
        dailyStudentKey: lastKey.dailyStudentKey,
      };
      return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    } catch (error) {
      this.logger.error('Failed to encode cursor', error);
      throw new BadRequestException('커서 생성에 실패했습니다.');
    }
  }
}
