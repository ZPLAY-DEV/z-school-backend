import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import {
  CreateSchoolTermOfferingsDocs,
  DeleteAllSchoolTermOfferingsDocs,
  SchoolTermOfferingListDocs,
  SchoolTermOfferingPaginatedListDocs,
} from 'src/domain/offering/swagger/school-term-offering-swagger.decorator';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';

@Controller('schools')
@ApiTags('✅ Schools > Terms > Offerings ( 학교 > 학기 > 수강신청과목 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermOfferingController {
  constructor(
    private readonly schoolTermOfferingService: SchoolTermOfferingService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolTermOfferingsDocs()
  @Post(':schoolId/terms/:termId/offerings/bulk')
  async createOfferings(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Offering[]> {
    return this.schoolTermOfferingService.create(schoolId, termId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermOfferingPaginatedListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/offerings/paginated')
  async getInfiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Offering>> {
    return await this.schoolTermOfferingService.infiniteList(
      schoolId,
      termId,
      query,
    );
  }

  @SchoolTermOfferingListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/offerings')
  async getList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('grade') grade: string | null = null,
  ): Promise<Offering[]> {
    return await this.schoolTermOfferingService.list(schoolId, termId, grade);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @DeleteAllSchoolTermOfferingsDocs()
  @Delete(':schoolId/terms/:termId/offerings')
  async deleteAll(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<number> {
    return await this.schoolTermOfferingService.deleteAll(schoolId, termId);
  }
}
