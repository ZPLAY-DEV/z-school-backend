import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { CacheInvalidate } from 'src/common/decorators/cache-invalidate.decorator';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonService } from 'src/domain/lesson/lesson.service';
import {
  CreateLessonDocs,
  CreateLessonDryRunDocs,
  GetLessonByIdDocs,
  GetStudentsByLessonIdDocs,
  RemoveLessonDocs,
  UpdateLessonDocs,
} from 'src/domain/lesson/swagger/lesson-swagger.decorator';

//! 단일 Lesson 엔터티 작업
@ApiTags('✳️ Lessons ( 과목 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateLessonDocs()
  @Post()
  @CacheInvalidate({
    tags: (req) => [
      `schools:${req.body.schoolId}:terms:${req.body.termId}:lessons`,
    ],
  })
  async create(@Body() dto: CreateLessonDto): Promise<Lesson> {
    return await this.lessonService.create(dto);
  }

  @CreateLessonDryRunDocs()
  @Post('dryrun')
  @HttpCode(200)
  async createDryRun(@Body() dto: CreateLessonDto): Promise<Lesson | null> {
    return await this.lessonService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetLessonByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Lesson> {
    return await this.lessonService.findById(id, [
      'groups',
      'groups.sam',
      'groups.sam.instructor',
      'groups.picks',
      'category',
    ]);
  }

  @GetStudentsByLessonIdDocs()
  @Get(':id/students')
  async listPickedStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PickedStudentDto[]> {
    return await this.lessonService.listPickedStudents(id);
  }

  @GetStudentsByLessonIdDocs()
  @Get(':id/students/paginated')
  async listPickedStudentsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<PickedStudentDto>> {
    return await this.lessonService.listPickedStudentsPaginated(id, query);
  }

  @Get(':id/booked-students')
  async listBookedStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('isPending') isPending?: string,
  ): Promise<any[]> {
    return await this.lessonService.listBookedStudents(id, isPending);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateLessonDocs()
  @Patch(':id')
  @CacheInvalidate({
    tags: (req) => {
      // req.body에 schoolId와 termId가 있으면 사용
      if (req.body?.schoolId && req.body?.termId) {
        return [
          `schools:${req.body.schoolId}:terms:${req.body.termId}:lessons`,
        ];
      }
      // 없으면 req.params.id를 사용 (실제 Lesson 조회는 서비스 레벨에서 처리하거나
      // 클라이언트가 항상 schoolId, termId를 포함하도록 함)
      // 여기서는 빈 배열 반환하여 무효화하지 않음 (req.body에 정보가 있을 때만 무효화)
      return [];
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ): Promise<Lesson> {
    return await this.lessonService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @RemoveLessonDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Lesson> {
    return await this.lessonService.remove(id);
  }
}
