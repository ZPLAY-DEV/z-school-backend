import {
  ClassSerializerInterceptor,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import { CreateSchoolCalendarDocs } from 'src/domain/school/swagger/school-calendar-swagger.decorator';

@ApiTags('✳️ Schools > Calendar ( 학교 > 캘린더 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolCalendarController {
  constructor(private readonly schoolCalendarService: SchoolCalendarService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Post('calendars')
  async createAll(): Promise<number> {
    return await this.schoolCalendarService.createAll();
  }

  @CreateSchoolCalendarDocs()
  @Post(':schoolId/calendars')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number> {
    return await this.schoolCalendarService.create(schoolId);
  }
}
