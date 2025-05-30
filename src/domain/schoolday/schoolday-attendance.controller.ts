import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import {
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import {
  CreateAttendanceOfSchooldayWithDateDocs,
  CreateAttendanceOfSchooldayWithRangeDocs,
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

  @CreateAttendanceOfSchooldayWithDateDocs()
  @Post('attendances/date')
  async createWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<CreateAttendanceResultDto> {
    return await this.schooldayAttendanceService.createWithDate(dto);
  }

  @CreateAttendanceOfSchooldayWithRangeDocs()
  @Post('attendances/range')
  async createWithPeriod(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<CreateAttendanceResultDto> {
    return await this.schooldayAttendanceService.createWithPeriod(dto);
  }
}
