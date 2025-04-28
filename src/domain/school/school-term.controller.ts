import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { CreateTermDocs } from '../term/swagger/rest-swagger.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { HttpResponse } from 'src/core/http/http-response';
import { UpdateTermDto } from '../term/dto/update-term.dto';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools - Terms ( 운영기간관리 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools/terms')
export class SchoolTermController {
  constructor(private readonly schoolTermService: SchoolTermService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateTermDocs()
  @Post()
  async create(@Body() dto: CreateTermDto) {
    const term = await this.schoolTermService.create(dto);
    return HttpResponse.created(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTermDto,
  ) {
    const term = await this.schoolTermService.update(id, dto);
    return HttpResponse.ok(term);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @ApiOperation({ description: 'Term 리스트 w/ Pagination' })
  @PaginateQueryOptions()
  @Get(':schoolId/terms/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Term>> {
    return await this.schoolTermService.infiniteList(schoolId, query);
  }

  @Public()
  @ApiOperation({ description: 'Term 리스트 (all)' })
  @Get(':schoolId/terms')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Term[]> {
    return await this.schoolTermService.list(schoolId);
  }
}
