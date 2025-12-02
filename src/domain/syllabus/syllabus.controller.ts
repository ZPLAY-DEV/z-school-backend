import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { Program } from 'src/domain/program/entities/program.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateSyllabusWithWeeksDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { Syllabus } from './entities/syllabus.entity';
import { SyllabusService } from './syllabus.service';

@ApiTags('Syllabus')
@Controller('syllabuses')
export class SyllabusController {
  constructor(
    private readonly syllabusService: SyllabusService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @ApiOperation({ summary: '커리큘럼 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '커리큘럼이 성공적으로 생성됨',
    type: Syllabus,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  async create(
    @Body() createSyllabusDto: CreateSyllabusWithWeeksDto,
  ): Promise<Syllabus> {
    return await this.syllabusService.create(createSyllabusDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get()
  @ApiOperation({ summary: '전체 커리큘럼 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼 목록이 성공적으로 조회됨',
    type: [Syllabus],
  })
  async list(): Promise<Syllabus[]> {
    return await this.syllabusService.list();
  }

  @Get('paginated')
  @ApiOperation({ summary: '전체 커리큘럼 조회 (페이지네이션)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼 목록이 성공적으로 조회됨',
    type: [Syllabus],
  })
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Syllabus>> {
    return await this.syllabusService.infiniteList(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '특정 커리큘럼 상세 조회' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼이 성공적으로 조회됨',
    type: Syllabus,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Syllabus> {
    return await this.syllabusService.findOne(id);
  }

  @Public()
  @Get(':id/programs')
  @ApiOperation({ summary: '특정 커리큘럼의 프로그램 목록 조회' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램 목록이 성공적으로 조회됨',
    type: [Program],
  })
  async findPrograms(
    @Param('id', ParseIntPipe) id: number,
    @Query('isScorable', new ParseBoolPipe({ optional: true }))
    isScorable?: boolean,
    @Query('weekNumber', new ParseIntPipe({ optional: true }))
    weekNumber?: number,
  ): Promise<Program[]> {
    return await this.syllabusService.findPrograms(id, isScorable, weekNumber);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  @ApiOperation({ summary: '커리큘럼 수정' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '커리큘럼이 성공적으로 수정됨',
    type: Syllabus,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSyllabusDto: UpdateSyllabusDto,
  ): Promise<Syllabus> {
    return await this.syllabusService.update(id, updateSyllabusDto);
  }

  @Patch(':id/weeks')
  @ApiOperation({ summary: '커리큘럼 수정' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  async updateWeeks(
    @Param('id', ParseIntPipe) id: number,
    @Body('count') count: number,
  ): Promise<Syllabus> {
    const syllabus = await this.syllabusService.updateWeeks(id, count);
    return syllabus;
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
    await this.syllabusService.remove(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Manage Curriculums
  //? ---------------------------------------------------------------------- ?//

  @Post(':id/lessons')
  @ApiOperation({ summary: '커리큘럼에 레슨 추가' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '레슨이 성공적으로 추가됨',
    type: Syllabus,
  })
  async addLessons(
    @Param('id', ParseIntPipe) id: number,
    @Body('lessonIds') lessonIds: number[],
  ): Promise<Syllabus> {
    return await this.syllabusService.addLessons(id, lessonIds);
  }

  @Delete(':id/lessons')
  @ApiOperation({ summary: '커리큘럼에서 레슨 제거' })
  @ApiParam({ name: 'id', description: '커리큘럼 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '레슨이 성공적으로 제거됨',
    type: Syllabus,
  })
  async removeLessons(
    @Param('id', ParseIntPipe) id: number,
    @Body('lessonIds') lessonIds: number[],
  ): Promise<Syllabus> {
    return await this.syllabusService.removeLessons(id, lessonIds);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Extras
  //? ---------------------------------------------------------------------- ?//

  @Post('s3urls')
  async generateS3Urls(
    @Body()
    dto: {
      // schoolId: number;
      // termId: number;
      resource: string; // `syllabuses/1/programs/week1`
      mimeType: string;
      filename?: string;
    },
  ): Promise<IS3Urls> {
    return await this.uploadService.generateUploadUrls(
      dto.resource,
      dto.mimeType,
      dto.filename,
    );
  }
}
