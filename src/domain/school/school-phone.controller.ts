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
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolPhoneService } from './school-phone.service';
import { CreatePhoneDto } from '../phone/dto/create-phone.dto';
import { HttpResponse } from 'src/core/http/http-response';
import {
  CreateSchoolPhoneDocs,
  SchoolPhoneListDocs,
  SchoolPhoneListPaginatedDocs,
} from '../phone/swagger/rest-swagger.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools - Phone ( 학교 발신번호 관리 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolPhoneController {
  constructor(private readonly schoolPhoneService: SchoolPhoneService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolPhoneDocs()
  @Post('/phone')
  async create(@Body() dto: CreatePhoneDto) {
    await this.schoolPhoneService.create(dto);
    return HttpResponse.created();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
  @SchoolPhoneListDocs()
  @Get(':schoolId/phone')
  async findAll(@Param('schoolId', ParseIntPipe) schoolId: number) {
    const phones = await this.schoolPhoneService.findAll(schoolId);
    return HttpResponse.ok(phones);
  }

  @SchoolPhoneListPaginatedDocs()
  @Get(':schoolId/phone/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ) {
    const phones = await this.schoolPhoneService.infiniteList(schoolId, query);
    return HttpResponse.ok(phones);
  }
}
