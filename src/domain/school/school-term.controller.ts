import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';

@Controller('schools')
export class SchoolTermController {
  constructor(private readonly schoolTermService: SchoolTermService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Term 생성' })
  @Post(':schoolId/terms')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateTermDto,
  ): Promise<any> {
    console.log({ ...dto, schoolId });
    return await this.schoolTermService.create({ ...dto, schoolId });
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
