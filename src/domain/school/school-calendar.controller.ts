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
import { CacheInvalidate } from 'src/common/decorators/cache-invalidate.decorator';
import { HttpCache } from 'src/common/decorators/http-cache.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';

import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';
import {
  CreateAllSchoolCalendarsDocs,
  CreateSchoolCalendarDocs,
  ListSchoolCalendarsDocs,
  PaginatedSchoolCalendarsDocs,
} from 'src/domain/school/swagger/school-calendar-swagger.decorator';

@ApiTags('✳️ Schools > Calendar ( 학교 > 학사일정 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolCalendarController {
  constructor(private readonly schoolCalendarService: SchoolCalendarService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateAllSchoolCalendarsDocs()
  @Public()
  @Post('all/calendars')
  async createAll(): Promise<number> {
    return await this.schoolCalendarService.createAll();
  }

  @CreateSchoolCalendarDocs()
  @Public()
  @Post(':schoolId/calendars')
  @CacheInvalidate({
    tags: (req) => [`schools:${req.params.schoolId}:calendars`],
  })
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number> {
    return await this.schoolCalendarService.create(schoolId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSchoolCalendarsDocs()
  @Get(':schoolId/calendars')
  @HttpCache({
    ttl: 60 * 60, // 1시간
    tags: (req) => [`schools:${req.params.schoolId}:calendars`],
  })
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Calendar[]> {
    return await this.schoolCalendarService.list(schoolId);
  }

  @PaginatedSchoolCalendarsDocs()
  @Get(':schoolId/calendars/paginated')
  @HttpCache({
    ttl: 60 * 60, // 1시간
    tags: (req) => [`schools:${req.params.schoolId}:calendars`],
  })
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Calendar>> {
    return await this.schoolCalendarService.infiniteList(schoolId, query);
  }
}
