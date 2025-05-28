import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CreateSchooldayAttendanceDto } from 'src/domain/schoolday/dto/create-schoolday-attendance.dto';
import { SchooldayAttendanceService } from 'src/domain/schoolday/schoolday-attendance.service';

@Controller('schooldays')
export class SchooldayAttendanceController {
  constructor(
    private readonly schooldayAttendanceService: SchooldayAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 생성' })
  @Post('attendances')
  async create(@Body() dto: CreateSchooldayAttendanceDto): Promise<any> {
    return await this.schooldayAttendanceService.create2(dto);
  }
}
