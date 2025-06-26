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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IS3Urls } from 'src/common/interfaces';
import { NewsletterDetailResponseDto } from 'src/domain/newsletter/dto/newsletter-detail.response.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { GenerateS3UrlsDto } from './dto/generate-s3-urls.dto';
import { NewsletterService } from './newsletter.service';
import {
  CreateNewsletterDocs,
  GenerateNewsletterS3UrlsDocs,
  MarkAsReadDocs,
  UpdateNewsletterDocs
} from './swagger/newsletter-swagger.decorator';

@ApiTags('✅ Newsletters ( 뉴스레터 )')
@Controller('newsletters')
@UseInterceptors(ClassSerializerInterceptor)
export class NewsletterController {
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @CreateNewsletterDocs()
  @Post()
  create(@Body() dto: CreateNewsletterDto): Promise<Newsletter> {
    return this.newsletterService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({
    summary: '수강신청 뉴스레터 조회',
    description: '특정 학교와 학기의 수강신청 뉴스레터를 조회합니다.',
  })
  @ApiQuery({
    name: 'schoolId',
    type: Number,
    description: '학교 ID',
    example: 1,
  })
  @ApiQuery({
    name: 'termId',
    type: Number,
    description: '학기 ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '수강신청 뉴스레터 조회 성공',
    type: Newsletter,
  })
  @ApiResponse({
    status: 404,
    description: '뉴스레터를 찾을 수 없습니다',
  })
  @Get('registration')
  async findRegistration(
    @Query('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.findRegistration(schoolId, termId);
  }

  @ApiOperation({
    summary: '뉴스레터 상세 조회',
    description:
      '뉴스레터 ID로 상세 정보를 조회합니다. 수강신청 타입의 경우 학생 목록과 읽음 상태가 포함됩니다.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '뉴스레터 ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '뉴스레터 상세 조회 성공',
    type: NewsletterDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '뉴스레터를 찾을 수 없습니다',
  })
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NewsletterDetailResponseDto> {
    return await this.newsletterService.detail(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateNewsletterDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsletterDto,
  ): Promise<Newsletter> {
    console.log(dto);
    return await this.newsletterService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? TRACKING
  //? ---------------------------------------------------------------------- ?//

  @MarkAsReadDocs()
  @Delete(':newsletterId/read')
  markAsRead(
    @Param('newsletterId', ParseIntPipe) newsletterId: number,
    @Query('parentId', ParseIntPipe) parentId: number,
  ): Promise<void> {
    return this.newsletterService.markAsRead(newsletterId, parentId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Extras
  //? ---------------------------------------------------------------------- ?//

  @GenerateNewsletterS3UrlsDocs()
  @Post('s3urls')
  async generateS3Urls(@Body() dto: GenerateS3UrlsDto): Promise<IS3Urls> {
    const path = [
      `schools`,
      `${dto.schoolId}`,
      `terms`,
      `${dto.termId}`,
      `newsletters`,
    ].join('/');
    return await this.uploadService.generateUploadUrls(path, dto.mimeType);
  }
}
