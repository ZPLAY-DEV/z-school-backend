import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import {
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import {
  CreateAttendanceOfSchooldayWithDateDocs,
  CreateAttendanceOfSchooldayWithPeriodDocs,
} from 'src/domain/schoolday/swagger/schoolday-attendance-swagger.decorator';

@ApiTags('✅ Schooldays > Attendance ( 수업일 > 출석부 생성 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('schooldays')
export class SchooldayAttendanceController {
  constructor(
    private readonly schooldayAttendanceService: SchooldayAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //* CRON JOB 으로 새벽 2시에 호출된다.
  @CreateAttendanceOfSchooldayWithDateDocs()
  @Public()
  @Post('attendances/date')
  async createWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<CreateAttendanceResultDto> {
    return await this.schooldayAttendanceService.createAttendancesForDate(dto);
  }

  @CreateAttendanceOfSchooldayWithPeriodDocs()
  @Public()
  @Post('attendances/period')
  async createWithPeriod(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<CreateAttendanceResultDto> {
    return await this.schooldayAttendanceService.createAttendancesForPeriod(
      dto,
    );
  }
}
