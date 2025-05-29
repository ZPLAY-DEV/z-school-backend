import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';
import { CreateAttendanceOfSchooldayWithRangeDocs } from 'src/domain/schoolday/swagger/schoolday-attendance-swagger.decorator';

@ApiTags('✅ Schooldays > Attendance ( 수업일 > 출석 )')
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

  @ApiOperation({ description: 'Schoolday 생성' })
  @Post('attendances/date')
  async createWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<any> {
    return await this.schooldayAttendanceService.createWithDate(dto);
  }

  @CreateAttendanceOfSchooldayWithRangeDocs()
  @Post('attendances/range')
  async createWithRange(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<any> {
    return await this.schooldayAttendanceService.createWithRange(dto);
  }
}
