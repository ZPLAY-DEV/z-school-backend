import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  DeleteAttendanceBySchoolTermDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import {
  AnalyzeDataVolumeDocs,
  CreateAttendanceForAllValidTermsDocs,
  CreateAttendanceOfSchooldayWithDateDocs,
  CreateAttendanceOfSchooldayWithPeriodDocs,
  DeleteAttendanceByDateDocs,
  DeleteAttendanceByPeriodDocs,
  DeleteAttendancesBySchoolAndTermDocs,
  DeleteGroupAttendanceDocs,
  PurgeTableDocs,
} from 'src/domain/schoolday/swagger/schoolday-attendance-swagger.decorator';

@ApiTags('✳️ Schooldays > Attendance ( 수업일 > 출석부 생성 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('schooldays')
export class SchooldayAttendanceController {
  constructor(
    private readonly schooldayAttendanceService: SchooldayAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateAttendanceForAllValidTermsDocs()
  @Public()
  @Post('attendances/all')
  async createAttendanceForAllValidTerms(
    @Body('date') date?: string,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.createAttendanceForAllValidTerms(
      date,
    );
  }

  @CreateAttendanceOfSchooldayWithDateDocs()
  @Post('attendances/date')
  async createWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.createWithDate(dto);
  }

  @CreateAttendanceOfSchooldayWithPeriodDocs()
  @Post('attendances/period')
  async createWithPeriod(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.createWithPeriod(dto);
  }

  /**
   * 🔍 데이터량 분석을 위한 디버그 엔드포인트
   * 실제 출석부 생성 없이 데이터량만 확인
   */
  @AnalyzeDataVolumeDocs()
  @Public()
  @Post('attendances/period/dryrun')
  async analyzeDataVolume(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<any> {
    return await this.schooldayAttendanceService.analyzeDataVolume(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  /**
   * 특정 학교/학기의 모든 그룹에 대해 완전한 출석 데이터 삭제를 수행합니다.
   * 기존 메서드의 개선된 버전으로, 쓰레기 데이터까지 완전히 제거합니다.
   */
  @PurgeTableDocs()
  @Public()
  @Delete('attendances/complete')
  async deleteAllAttendancesBySchoolAndTerm(): Promise<void> {
    await this.schooldayAttendanceService.purge();
  }

  @DeleteAttendancesBySchoolAndTermDocs()
  @Public()
  @Delete('attendances/all')
  async deleteAttendancesBySchoolAndTerm(
    @Body() dto: DeleteAttendanceBySchoolTermDto,
  ): Promise<void> {
    await this.schooldayAttendanceService.deleteAllAttendancesBySchoolAndTerm(
      dto,
    );
  }

  /**
   * 특정 그룹의 모든 출석 데이터를 완전히 삭제합니다.
   * DynamoDB에서 해당 partition key의 모든 레코드를 스캔하여 삭제합니다.
   */
  @DeleteGroupAttendanceDocs()
  @Public()
  @Delete('attendances/group/:groupKey')
  async deleteAllAttendancesByGroupKey(
    @Param('groupKey') groupKey: string,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteAllAttendancesByGroupKey(
      groupKey,
    );
  }

  @DeleteAttendanceByDateDocs()
  @Public()
  @Delete('attendances/date')
  async deleteWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteWithDate(dto);
  }

  @DeleteAttendanceByPeriodDocs()
  @Public()
  @Delete('attendances/period')
  async deleteWithPeriod(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteWithPeriod(dto);
  }
}
