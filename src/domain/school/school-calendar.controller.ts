import {
  ClassSerializerInterceptor,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { CreateSchoolCalendarDocs } from 'src/domain/school/swagger/school-calendar-swagger.decorator';

@ApiTags('✅ Schools > Calendar ( 학교 > 캘린더 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolCalendarController {
  constructor(private readonly schoolCalendarService: SchoolCalendarService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolCalendarDocs()
  @Post(':schoolId/calendars')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number> {
    return await this.schoolCalendarService.create(schoolId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
}
