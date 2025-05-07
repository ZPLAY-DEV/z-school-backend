import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  Paginate,
  PaginateConfig,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateLessonResponseDto } from 'src/domain/lesson/dto/create-lesson-response.dto';
import { CreateLessonRequestDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import {
  CreateSchoolTermLessonBulkDocs,
  CreateSchoolTermLessonDocs,
  SchoolTermLessonListDocs,
  UpdateSchoolTermLessonDocs,
} from 'src/domain/lesson/swagger/rest-swagger.decorator';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';

const USER_PAGINATION_CONFIG: PaginateConfig<Lesson> = {
  sortableColumns: ['id', 'lessonName', 'termId'],
  defaultSortBy: [['id', 'DESC']],
  searchableColumns: ['schoolName', 'lessonName'],
  filterableColumns: {
    schoolName: true,
    lessonName: true,
  },
};

@Controller('schools')
@ApiTags('Schools - Term Lessons ( 학교 학기별 과목 관리 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermLessonController {
  constructor(
    private readonly schoolTermLessonService: SchoolTermLessonService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolTermLessonDocs()
  @Post(':schoolId/terms/:termId/lessons')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: CreateLessonRequestDto,
  ): Promise<Lesson> {
    return await this.schoolTermLessonService.create({
      ...dto,
      schoolId,
      termId,
    });
  }

  @Public()
  @CreateSchoolTermLessonBulkDocs()
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

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateSchoolTermLessonDocs()
  @Patch(':schoolId/terms/:termId/lessons/:lessonId')
  async update(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: UpdateLessonDto,
  ): Promise<Lesson> {
    return await this.schoolTermLessonService.update(lessonId, {
      ...dto,
      schoolId,
      termId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @ApiOkPaginatedResponse(CreateLessonResponseDto, USER_PAGINATION_CONFIG)
  @ApiPaginationQuery(USER_PAGINATION_CONFIG)
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

  @Public()
  @SchoolTermLessonListDocs()
  @Get(':schoolId/terms/:termId/lessons')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Lesson[]> {
    return await this.schoolTermLessonService.list(schoolId, termId);
  }
}
