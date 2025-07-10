import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import {
  SchoolTermSamSchooldaysDocs,
  SchoolTermSamWeeklySchooldaysDocs,
} from './swagger/school-term-sam-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Sams ( 학교 > 학기 > 담임쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSamController {
  constructor(
    private readonly schoolTermStudentService: SchoolTermSamService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermSamSchooldaysDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/schooldays')
  async listSchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<Schoolday[]> {
    return await this.schoolTermStudentService.listSchooldays(
      schoolId,
      termId,
      samId,
    );
  }

  @SchoolTermSamWeeklySchooldaysDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/weekly-schooldays')
  async listWeeklySchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
    @Query('date') date?: string,
  ): Promise<Record<string, Schoolday[]>> {
    return await this.schoolTermStudentService.listWeeklySchooldays(
      schoolId,
      termId,
      samId,
      date,
    );
  }
}
