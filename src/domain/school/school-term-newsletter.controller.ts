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
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { SchoolTermNewsletterService } from 'src/domain/school/school-term-newsletter.service';
import {
  InfiniteListSchoolTermNewslettersDocs,
  ListSchoolTermNewslettersDocs,
} from 'src/domain/school/swagger/school-newsletter-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Newsletters ( 학교 > 학기 > 뉴스레터 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermNewsletterController {
  constructor(
    private readonly schoolTermNewsletterService: SchoolTermNewsletterService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSchoolTermNewslettersDocs()
  @Get(':schoolId/newsletters')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
  ): Promise<Newsletter[]> {
    return await this.schoolTermNewsletterService.list(schoolId, termId);
  }

  @InfiniteListSchoolTermNewslettersDocs()
  @Get(':schoolId/newsletters/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
    @Query('termId') termId: number,
  ) {
    return await this.schoolTermNewsletterService.infiniteList(
      schoolId,
      query,
      termId,
    );
  }
}
