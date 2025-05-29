import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateAttendanceOfSchooldayWithRangeDto } from 'src/domain/schoolday/dto/create-attendance-of-schoolday.dto';
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

  // @ApiOperation({ description: 'Schoolday 생성' })
  // @Post('attendances/date')
  // async createWithDate(
  //   @Body() dto: CreateAttendanceOfSchooldayWithDateDto,
  // ): Promise<any> {
  //   return await this.schooldayAttendanceService.create2(dto);
  // }

  @CreateAttendanceOfSchooldayWithRangeDocs()
  @Post('attendances/range')
  async createWithRange(
    @Body() dto: CreateAttendanceOfSchooldayWithRangeDto,
  ): Promise<any> {
    return await this.schooldayAttendanceService.create2(dto);
  }
}
