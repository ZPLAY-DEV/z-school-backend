import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateLessonRequestDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';

@Controller('schools')
export class SchoolTermLessonController {
  constructor(
    private readonly schoolTermLessonService: SchoolTermLessonService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Lesson 생성' })
  @Post(':schoolId/terms/:termId/lessons')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: CreateLessonRequestDto,
  ): Promise<any> {
    return await this.schoolTermLessonService.create({
      ...dto,
      schoolId,
      termId,
    });
  }

  @Public()
  @ApiOperation({ description: 'Lessons 생성' })
  @Post(':schoolId/terms/:termId/lessons/bulk')
  @HttpCode(200)
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dtos: CreateLessonRequestDto[],
  ): Promise<any> {
    const createLessonDtos = dtos.map((dto) => ({
      ...dto,
      schoolId,
      termId,
    }));

    return await this.schoolTermLessonService.createBulk(createLessonDtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @ApiOperation({ description: 'Lesson 리스트 w/ Pagination' })
  @PaginateQueryOptions()
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
  @ApiOperation({ description: 'Lesson 리스트 (all)' })
  @Get(':schoolId/terms/:termId/lessons')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Lesson[]> {
    return await this.schoolTermLessonService.list(schoolId, termId);
  }
}
