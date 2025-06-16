import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  // Get,
  // Param,
  // ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolLetterService } from 'src/domain/school/school-letter.service';

// import { Paginate } from 'nestjs-paginate';

@ApiTags('✅ Schools > Dispatch ( 학교 > 발송 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolLetterController {
  constructor(private readonly schoolLetterService: SchoolLetterService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
  @Get(':schoolId/terms/:termId/dispatchs/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Paginate() query: PaginateQuery,
  ) {
    return await this.schoolLetterService.infiniteList(schoolId, termId, query);
  }
}
