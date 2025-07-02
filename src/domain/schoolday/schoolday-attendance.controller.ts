import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  DeleteAttendanceBySchoolTermDto,
  ResponseAttendanceDto
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

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Delete('attendances/all')
  async deleteAttendancesBySchoolAndTerm(
    @Body() dto: DeleteAttendanceBySchoolTermDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteAttendancesBySchoolAndTerm(
      dto,
    );
  }

  @Public()
  @Delete('attendances/date')
  async deleteWithDate(
    @Body() dto: CreateDynamoRecordWithDateDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteWithDate(dto);
  }

  @Public()
  @Delete('attendances/period')
  async deleteWithPeriod(
    @Body() dto: CreateDynamoRecordWithRangeDto,
  ): Promise<ResponseAttendanceDto> {
    return await this.schooldayAttendanceService.deleteWithPeriod(dto);
  }
}
