import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  // Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';

import {
  CreateTermDocs,
  ListTermDocs,
  PaginatedTermDocs,
} from '../term/swagger/rest-swagger.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { HttpResponse } from 'src/core/http/http-response';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools - Terms ( 운영기간관리 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolTermController {
  constructor(private readonly schoolTermService: SchoolTermService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateTermDocs()
  @Post('/terms')
  async create(@Body() dto: CreateTermDto) {
    const term = await this.schoolTermService.create(dto);
    return HttpResponse.created(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//
  // @Patch(':id')
  // async update(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateTermDto,
  // ) {
  //   // const term = await this.schoolTermService.update(id, dto);
  //   // return HttpResponse.ok(term);
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @PaginatedTermDocs()
  @Get(':schoolId/terms/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<HttpResponse> {
    const terms = await this.schoolTermService.infiniteList(schoolId, query);
    return HttpResponse.ok(terms);
  }

  @ListTermDocs()
  @Get(':schoolId/terms')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<HttpResponse> {
    const terms = await this.schoolTermService.list(schoolId);
    return HttpResponse.ok(terms);
  }
}
