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

import { SchoolNewsletterService } from 'src/domain/school/school-newsletter.service';

// import { Paginate } from 'nestjs-paginate';

@ApiTags('✅ Schools > Dispatch ( 학교 > 발송 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolNewsletterController {
  constructor(
    private readonly schoolNewsletterService: SchoolNewsletterService,
  ) {}

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
    return await this.schoolNewsletterService.infiniteList(
      schoolId,
      termId,
      query,
    );
  }
}
