import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { Curriculum } from './entities/curriculum.entity';

@ApiTags('Curriculum')
@Controller('curriculums')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @ApiOperation({ summary: '커리큘럼 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '커리큘럼이 성공적으로 생성됨',
    type: Curriculum,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 lesson 또는 syllabus를 찾을 수 없음',
  })
  async create(
    @Body() createCurriculumDto: CreateCurriculumDto,
  ): Promise<Curriculum> {
    return await this.curriculumService.create(createCurriculumDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get()
  @ApiOperation({
    summary: '전체 커리큘럼 조회 또는 lesson/syllabus별 커리큘럼 조회',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼 목록이 성공적으로 조회됨',
    type: [Curriculum],
  })
  async findAll(
    @Query('lessonId', new ParseIntPipe({ optional: true }))
    lessonId?: number,
    @Query('syllabusId', new ParseIntPipe({ optional: true }))
    syllabusId?: number,
  ): Promise<Curriculum[]> {
    if (lessonId) {
      return await this.curriculumService.findByLesson(lessonId);
    }
    if (syllabusId) {
      return await this.curriculumService.findBySyllabus(syllabusId);
    }
    return await this.curriculumService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 커리큘럼 상세 조회' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼이 성공적으로 조회됨',
    type: Curriculum,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Curriculum> {
    return await this.curriculumService.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':lessonId')
  @ApiOperation({ summary: '커리큘럼 수정' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼이 성공적으로 수정됨',
    type: Curriculum,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async update(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: UpdateCurriculumDto,
  ): Promise<Curriculum> {
    return await this.curriculumService.update(lessonId, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '커리큘럼 삭제 (soft delete)' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '커리큘럼이 성공적으로 삭제됨',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.curriculumService.remove(id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'lessonId와 syllabusId에 해당하는 커리큘럼 삭제' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '커리큘럼이 성공적으로 삭제됨',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async removeByIds(
    @Body() dto: { lessonId: number; syllabusId: number },
  ): Promise<void> {
    await this.curriculumService.removeByIds(dto);
  }
}
