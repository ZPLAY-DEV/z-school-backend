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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { Story } from './entities/story.entity';
import { StoryService } from './story.service';

@ApiTags('Story')
@Controller('stories')
export class StoryController {
  constructor(
    private readonly storyService: StoryService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @ApiOperation({ summary: '프로그램 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '프로그램이 성공적으로 생성됨',
    type: Story,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  async create(@Body() createStoryDto: CreateStoryDto): Promise<Story> {
    return await this.storyService.create(createStoryDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: '프로그램 대량 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '프로그램들이 성공적으로 생성됨',
    type: [Story],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '일부 syllabus를 찾을 수 없음',
  })
  async createBulk(
    @Body() createStoryDtos: CreateStoryDto[],
  ): Promise<Story[]> {
    return await this.storyService.createBulk(createStoryDtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get()
  @ApiOperation({ summary: '전체 프로그램 조회 또는 커리큘럼별 프로그램 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램 목록이 성공적으로 조회됨',
    type: [Story],
  })
  async findAll(
    @Query('syllabusId', new ParseIntPipe({ optional: true }))
    syllabusId?: number,
  ): Promise<Story[]> {
    if (syllabusId) {
      return await this.storyService.findBySyllabus(syllabusId);
    }
    return await this.storyService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '특정 프로그램 상세 조회' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램이 성공적으로 조회됨',
    type: Story,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Story> {
    return await this.storyService.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  @ApiOperation({ summary: '프로그램 수정' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램이 성공적으로 수정됨',
    type: Story,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoryDto,
  ): Promise<Story> {
    return await this.storyService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '프로그램 삭제 (soft delete)' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '프로그램이 성공적으로 삭제됨',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.storyService.remove(id);
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
      syllabusId: number;
      weekNumber: number;
      mimeType: string;
      filename?: string;
    },
  ): Promise<IS3Urls> {
    const path = [
      `syllabuses`,
      `${dto.syllabusId}`,
      `week${dto.weekNumber}`,
    ].join('/');
    return await this.uploadService.generateUploadUrls(
      path,
      dto.mimeType,
      dto.filename,
    );
  }
}
