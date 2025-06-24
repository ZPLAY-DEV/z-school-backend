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
import { ApiTags } from '@nestjs/swagger';
import { IS3Urls } from 'src/common/interfaces';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterService } from './newsletter.service';
import {
  CheckReadStatusDocs,
  CreateNewsletterDocs,
  FindNewsletterByIdDocs,
  GenerateNewsletterS3UrlsDocs,
  GetUnreadParentsDocs,
  MarkAsReadDocs,
  UpdateNewsletterDocs,
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
  create(@Body() dto: CreateNewsletterDto) {
    return this.newsletterService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindNewsletterByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Newsletter> {
    return await this.newsletterService.findById(id, ['unreadParents']);
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
    return await this.newsletterService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? TRACKING
  //? ---------------------------------------------------------------------- ?//

  @GetUnreadParentsDocs()
  @Get(':newsletterId/unread-parents')
  getUnreadParents(@Param('newsletterId', ParseIntPipe) newsletterId: number) {
    return this.newsletterService.getUnreadParents(newsletterId);
  }

  @CheckReadStatusDocs()
  @Get(':newsletterId/read-status')
  isReadByParent(
    @Param('newsletterId', ParseIntPipe) newsletterId: number,
    @Query('parentId', ParseIntPipe) parentId: number,
  ) {
    return this.newsletterService.isReadByParent(newsletterId, parentId);
  }

  @MarkAsReadDocs()
  @Delete(':newsletterId/read')
  markAsRead(
    @Param('newsletterId', ParseIntPipe) newsletterId: number,
    @Query('parentId', ParseIntPipe) parentId: number,
  ) {
    return this.newsletterService.markAsRead(newsletterId, parentId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Extras
  //? ---------------------------------------------------------------------- ?//

  @GenerateNewsletterS3UrlsDocs()
  @Post('s3urls')
  async generateS3Urls(
    @Body()
    dto: {
      schoolId: number;
      termId: number;
      mimeType: string;
    },
  ): Promise<IS3Urls> {
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
