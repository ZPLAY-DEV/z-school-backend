import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateLessonRequestDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import {
  CreateSchoolTermLessonsBulkDocs,
  CreateSchoolTermLessonsBulkDryRunDocs,
  DeleteAllSchoolTermLessonsDocs,
  SchoolTermLessonListDocs,
  SchoolTermLessonPaginatedListDocs,
} from 'src/domain/school/swagger/school-term-lesson-swagger.decorator';

@ApiTags('✅ Schools > Terms > Lessons ( 학교 > 학기 > 과목 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermLessonController {
  constructor(
    private readonly schoolTermLessonService: SchoolTermLessonService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolTermLessonsBulkDocs()
  @Post(':schoolId/terms/:termId/lessons/bulk')
  @HttpCode(200)
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dtos: CreateLessonRequestDto[],
  ): Promise<Lesson[]> {
    const createLessonDtos = dtos.map((dto) => ({
      ...dto,
      schoolId,
      termId,
    }));

    return await this.schoolTermLessonService.createBulk(createLessonDtos);
  }

  //! create() 의 모든 로직이 무사히 실행되는지 persist 하지 않고, 실험해보기 위한 것이
  //! dryrun() 인데, 그냥 중복 강좌 레코드가 있는지만 확인하고 말았다. ㅠ.ㅠ

  @CreateSchoolTermLessonsBulkDryRunDocs()
  @Post(':schoolId/terms/:termId/lessons/bulk/dryrun')
  @HttpCode(200)
  async createBulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dtos: CreateLessonRequestDto[],
  ): Promise<Lesson[]> {
    const createLessonDtos = dtos.map((dto) => ({
      ...dto,
      schoolId,
      termId,
    }));

    return await this.schoolTermLessonService.createBulk(
      createLessonDtos,
      true,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermLessonPaginatedListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/lessons/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Lesson>> {
    return await this.schoolTermLessonService.infiniteList(
      schoolId,
      termId,
      query,
    );
  }

  @SchoolTermLessonListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/lessons')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Lesson[]> {
    return await this.schoolTermLessonService.list(schoolId, termId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @DeleteAllSchoolTermLessonsDocs()
  @Delete(':schoolId/terms/:termId/lessons')
  async deleteAll(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<number> {
    return await this.schoolTermLessonService.deleteAll(schoolId, termId);
  }
}
