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
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { NewsletterType } from 'src/common/enums/newsletter-type';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import {
  InfiniteListSchoolTermNewslettersDocs,
  ListSchoolTermNewslettersDocs,
} from 'src/domain/newsletter/swagger/school-newsletter-swagger.decorator';

import { SchoolNewsletterService } from 'src/domain/school/school-newsletter.service';

// import { Paginate } from 'nestjs-paginate';

@ApiTags('✅ Schools > Newsletters ( 학교 > 뉴스레터 )')
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

  @ListSchoolTermNewslettersDocs()
  @Get(':schoolId/newsletters')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId', new ParseIntPipe({ optional: true })) termId?: number,
    @Query('type') type?: NewsletterType,
  ): Promise<Newsletter[]> {
    return await this.schoolNewsletterService.list(schoolId, termId, type);
  }

  @InfiniteListSchoolTermNewslettersDocs()
  @Get(':schoolId/newsletters/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
    @Query('termId', new ParseIntPipe({ optional: true })) termId?: number,
    @Query('type') type?: NewsletterType,
  ) {
    return await this.schoolNewsletterService.infiniteList(
      schoolId,
      query,
      termId,
      type,
    );
  }
}
