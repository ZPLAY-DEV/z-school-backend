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
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { ResponseSchoolOfferingListDto } from 'src/domain/school/dto/response-school-offering-list.dto';
import { SchoolTermOfferingService } from 'src/domain/school/school-term-offering.service';
import {
  CreateSchoolTermOfferingsDocs,
  DeleteAllSchoolTermOfferingsDocs,
  GetPersonalListDocs,
  SchoolTermOfferingListDocs,
  SchoolTermOfferingPaginatedListDocs,
} from 'src/domain/school/swagger/school-term-offering-swagger.decorator';

@Controller('schools')
@ApiTags('✳️ Schools > Terms > Offerings ( 학교 > 학기 > 수강신청과목 )')
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
    @Query('studentId') studentId?: number,
  ): Promise<Paginated<Offering>> {
    return await this.schoolTermOfferingService.infiniteList(
      query,
      schoolId,
      termId,
      studentId,
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

  @GetPersonalListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/offerings/personal')
  async getPersonalList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Query('studentId') studentId: number,
    @Query('grade') grade: number,
    @Query('categoryId') categoryId?: number,
    @Query('booking') booking?: boolean,
    @Query('weekday') weekday?: boolean,
  ): Promise<ResponseSchoolOfferingListDto[]> {
    return await this.schoolTermOfferingService.personalList(
      schoolId,
      termId,
      studentId,
      grade,
      categoryId,
      booking,
      weekday,
    );
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
