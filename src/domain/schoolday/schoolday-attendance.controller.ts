import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import {
  CreateAttendanceOfSchooldayWithDateDocs,
  CreateAttendanceOfSchooldayWithPeriodDocs,
} from 'src/domain/schoolday/swagger/schoolday-attendance-swagger.decorator';

@ApiTags('✅ Schooldays > Attendance ( 수업일 > 출석부 생성 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('schooldays')
export class SchooldayAttendanceController {
  constructor(
    private readonly schooldayAttendanceService: SchooldayAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '🕒 Cronjob 용 모든 학교 출석부 생성' })
  @Public()
  @Post('attendances')
  async createAllWithDate(
    @Body('date') date?: string,
  ): Promise<ResponseAttendanceDto[]> {
    return await this.schooldayAttendanceService.createAllWithDate(date);
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
}
