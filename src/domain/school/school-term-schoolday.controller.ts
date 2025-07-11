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
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { SchoolTermSchooldayService } from 'src/domain/school/school-term-schoolday.service';
import {
  ListSchooldaysDocs,
  PaginatedListSchooldaysDocs,
} from 'src/domain/school/swagger/school-term-schoolday-swagger.decorator';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';

@ApiTags('✳️ Schools > Terms > Schooldays ( 학교 > 학기 > 수업일 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSchooldayController {
  constructor(
    private readonly schoolTermSchooldayService: SchoolTermSchooldayService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSchooldaysDocs()
  @Get(':schoolId/terms/:termId/schooldays')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('date') date?: string,
  ): Promise<Schoolday[]> {
    return await this.schoolTermSchooldayService.list(schoolId, termId, date);
  }

  @PaginatedListSchooldaysDocs()
  @Get(':schoolId/terms/:termId/schooldays/paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('date') date?: string,
  ): Promise<Paginated<Schoolday>> {
    return await this.schoolTermSchooldayService.infiniteList(
      query,
      schoolId,
      termId,
      date,
    );
  }
}
