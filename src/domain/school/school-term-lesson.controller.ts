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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CacheInvalidate } from 'src/common/decorators/cache-invalidate.decorator';
import { HttpCache } from 'src/common/decorators/http-cache.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateLessonRequestDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { SchoolTermLessonService } from 'src/domain/school/school-term-lesson.service';
import {
  SchoolTermLessonsCreateBulkDocs,
  SchoolTermLessonsCreateBulkDryrunDocs,
  SchoolTermLessonsDeleteAllDocs,
  SchoolTermLessonsDocs,
  SchoolTermLessonsDownloadExcelDocs,
  SchoolTermLessonsPaginatedDocs,
  SchoolTermLessonsUploadExcelDocs,
} from 'src/domain/school/swagger/school-term-lesson-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Lessons ( 학교 > 학기 > 과목 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermLessonController {
  constructor(
    private readonly schoolTermLessonService: SchoolTermLessonService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //! create() 의 모든 로직이 무사히 실행되는지 persist 하지 않고, 실험해보기 위한 것이
  //! dryrun() 인데, 그냥 중복 강좌 레코드가 있는지만 확인하고 말았다. ㅠ.ㅠ
  @SchoolTermLessonsCreateBulkDryrunDocs()
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

    return await this.schoolTermLessonService.createBulkDryrun(
      createLessonDtos,
    );
  }

  @SchoolTermLessonsCreateBulkDocs()
  @Post(':schoolId/terms/:termId/lessons/bulk')
  @HttpCode(200)
  @CacheInvalidate({
    tags: (req) => [
      `schools:${req.params.schoolId}:terms:${req.params.termId}:lessons`,
    ],
  })
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dtos: CreateLessonRequestDto[],
  ): Promise<number> {
    const createLessonDtos = dtos.map((dto) => ({
      ...dto,
      schoolId,
      termId,
    }));

    return await this.schoolTermLessonService.createBulk(
      schoolId,
      termId,
      createLessonDtos,
    );
  }

  @SchoolTermLessonsUploadExcelDocs()
  @Post(':schoolId/terms/:termId/lessons/upload')
  @UseInterceptors(FileInterceptor('file'))
  @CacheInvalidate({
    tags: (req) => [
      `schools:${req.params.schoolId}:terms:${req.params.termId}:lessons`,
    ],
  })
  async uploadStudents(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<number> {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }
    const createLessonDtos = await this.schoolTermLessonService.parseExcel(
      schoolId,
      termId,
      file,
    );

    await this.schoolTermLessonService.createBulk(
      schoolId,
      termId,
      createLessonDtos,
    );

    return createLessonDtos.length;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermLessonsDownloadExcelDocs()
  @Public()
  @Get(':schoolId/terms/:termId/lessons/download')
  async downloadExcel(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Res() res: Response,
  ) {
    const workbook = await this.schoolTermLessonService.generateExcel(
      schoolId,
      termId,
    );
    const date = new Date().toISOString().split('T')[0];

    // 한글 파일명을 URL 인코딩
    const filename = `강좌목록-${date}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );

    // 엑셀 파일을 response stream으로 작성
    await workbook.xlsx.write(res);
    res.end();
  }

  @SchoolTermLessonsPaginatedDocs()
  @Public()
  @Get(':schoolId/terms/:termId/lessons/paginated')
  @HttpCache({
    ttl: 180, // 3분
    tags: (req) => [
      `schools:${req.params.schoolId}:terms:${req.params.termId}:lessons`,
    ],
  })
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

  @SchoolTermLessonsDocs()
  @Public()
  @Get(':schoolId/terms/:termId/lessons')
  @HttpCache({
    ttl: 300, // 5분
    tags: (req) => [
      `schools:${req.params.schoolId}:terms:${req.params.termId}:lessons`,
    ],
  })
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Lesson[]> {
    return await this.schoolTermLessonService.list(schoolId, termId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermLessonsDeleteAllDocs()
  @Delete(':schoolId/terms/:termId/lessons')
  @CacheInvalidate({
    tags: (req) => [
      `schools:${req.params.schoolId}:terms:${req.params.termId}:lessons`,
    ],
  })
  async deleteAll(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<number> {
    return await this.schoolTermLessonService.deleteAll(schoolId, termId);
  }
}
