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
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolPhoneService } from './school-phone.service';
import { CreatePhoneDto } from '../phone/dto/create-phone.dto';
import { HttpResponse } from 'src/core/http/http-response';
import {
  CreateSchoolPhoneDocs,
  SchoolIsActivePhoneDocs,
  SchoolIsActivePhoneUpdateDocs,
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

  //? 전체 학교 발신번호 리스트 조회 ( 페이징 X )
  @SchoolPhoneListDocs()
  @Get(':schoolId/phone')
  async findAll(@Param('schoolId', ParseIntPipe) schoolId: number) {
    const phones = await this.schoolPhoneService.findAll(schoolId);
    return HttpResponse.ok(phones);
  }

  //? 전체 학교 발신번호 리스트 조회 ( 페이징 O )
  @SchoolPhoneListPaginatedDocs()
  @Get(':schoolId/phone/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ) {
    const phones = await this.schoolPhoneService.infiniteList(schoolId, query);
    return HttpResponse.ok(phones);
  }

  //? 학교의 활성화된 발송번호 조회
  @SchoolIsActivePhoneDocs()
  @Get(':schoolId/phone/active')
  async findActivePhone(@Param('schoolId', ParseIntPipe) schoolId: number) {
    const phone = await this.schoolPhoneService.findActivePhone(schoolId);
    return HttpResponse.ok(phone);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? 학교 발신번호 활성화/비활성화
  @SchoolIsActivePhoneUpdateDocs()
  @Patch(':schoolId/phone/:phoneId')
  async update(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('phoneId', ParseIntPipe) phoneId: number,
  ) {
    await this.schoolPhoneService.updateIsActive(schoolId, phoneId);
    return HttpResponse.ok();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
}
