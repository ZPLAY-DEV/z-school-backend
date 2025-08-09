import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';

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
  @Post('all/calendars')
  async createAll(): Promise<number> {
    return await this.schoolCalendarService.createAll();
  }

  @CreateSchoolCalendarDocs()
  @Public()
  @Post(':schoolId/calendars')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number> {
    return await this.schoolCalendarService.create(schoolId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':schoolId/calendars')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Calendar[]> {
    return await this.schoolCalendarService.list(schoolId);
  }

  @Get(':schoolId/calendars/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Calendar>> {
    return await this.schoolCalendarService.infiniteList(schoolId, query);
  }
}
