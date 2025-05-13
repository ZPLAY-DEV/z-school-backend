import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/domain/lesson/dto/update-lesson.dto';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { LessonService } from 'src/domain/lesson/lesson.service';

//! 단일 Lesson 엔터티 작업
@ApiTags('✅ Lessons ( 과목 ) - 단수')
@ApiCommonErrorResponseTemplate()
@Controller('lessons')
@UseInterceptors(ClassSerializerInterceptor)
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Lesson 생성(upsert)' })
  @Post()
  async create(@Body() dto: CreateLessonDto): Promise<Lesson> {
    return await this.lessonService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Lesson 조회' })
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Lesson> {
    return await this.lessonService.findById(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Lesson 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLessonDto,
  ): Promise<Lesson> {
    return await this.lessonService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Lesson 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Lesson> {
    return await this.lessonService.remove(id);
  }
}
