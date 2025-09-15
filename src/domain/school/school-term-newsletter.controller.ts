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
import { NewsletterType } from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { SchoolTermNewsletterService } from 'src/domain/school/school-term-newsletter.service';
import {
  GetRegistrationNewsletterDocs,
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

  @GetRegistrationNewsletterDocs()
  @Get(':schoolId/terms/:termId/registration-newsletter')
  async getRegistrationNewsletter(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Newsletter> {
    return await this.schoolTermNewsletterService.getRegistrationNewsletter(
      schoolId,
      termId,
    );
  }

  @ListSchoolTermNewslettersDocs()
  @Get(':schoolId/terms/:termId/newsletters')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('type') type?: NewsletterType,
  ): Promise<Newsletter[]> {
    return await this.schoolTermNewsletterService.list(schoolId, termId, type);
  }

  @InfiniteListSchoolTermNewslettersDocs()
  @Get(':schoolId/terms/:termId/newsletters/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Paginate() query: PaginateQuery,
    @Query('type') type?: NewsletterType,
  ) {
    return await this.schoolTermNewsletterService.infiniteList(
      schoolId,
      query,
      termId,
      type,
    );
  }
}
