import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonService } from 'src/domain/lesson/lesson.service';
import {
  CreateLessonDocs,
  CreateLessonDryRunDocs,
  GetLessonByIdDocs,
  RemoveLessonDocs,
  UpdateLessonDocs,
} from 'src/domain/lesson/swagger/lesson-swagger.decorator';

//! 단일 Lesson 엔터티 작업
@ApiTags('✅ Lessons ( 과목 )')
@ApiCommonErrorResponseTemplate()
@Controller('lessons')
@UseInterceptors(ClassSerializerInterceptor)
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateLessonDocs()
  @Post()
  async create(@Body() dto: CreateLessonDto): Promise<Lesson> {
    return await this.lessonService.create(dto);
  }

  @CreateLessonDryRunDocs()
  @Get('dryrun')
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
      'groups.instructor',
      'category',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateLessonDocs()
  @Patch(':id')
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
