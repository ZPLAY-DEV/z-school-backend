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
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { NewsletterTarget } from 'src/common/enums';
import { SendStatus } from 'src/common/enums/send-status';
import { IS3Urls } from 'src/common/interfaces';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { GenerateS3UrlsDto } from 'src/domain/newsletter/dto/generate-s3-urls.dto';
import { ReadStatDto } from 'src/domain/newsletter/dto/read-stat.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import {
  CreateNewsletterDocs,
  DeleteNewsletterDocs,
  FindNewsletterByIdDocs,
  FindPendingDispatchesDocs,
  FindReadStatsDocs,
  FindReadStatsPaginatedDocs,
  GenerateNewsletterS3UrlsDocs,
  MarkAsReadDocs,
  ResendNewsletterDocs,
  SendNewsletterDocs,
  UpdateNewsletterDocs,
} from 'src/domain/newsletter/swagger/newsletter-swagger.decorator';
import { UploadService } from 'src/services/upload/upload.service';

@ApiTags('✳️ Newsletters ( 뉴스레터 )')
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
  async createNewsletter(
    @Body() dto: CreateNewsletterDto,
  ): Promise<Newsletter> {
    return await this.newsletterService.createNewsletter(dto);
  }

  @SendNewsletterDocs()
  @Put(':id/send')
  async sendNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      target: NewsletterTarget;
      targetItems: number[];
      scheduledAt: string;
      status: SendStatus;
    },
  ): Promise<Newsletter> {
    return await this.newsletterService.sendNewsletter(id, dto);
  }

  @ResendNewsletterDocs()
  @Put(':id/resend')
  async resendNewsletter(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.newsletterService.resendNewsletter(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindPendingDispatchesDocs()
  @Get('pending-items')
  async findPendingItems(): Promise<Newsletter[]> {
    return await this.newsletterService.findPendingItems();
  }

  @FindNewsletterByIdDocs()
  @Get(':id')
  async findDetailById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.findById(id);
  }

  @FindReadStatsDocs()
  @Get(':id/stats')
  async findReadStats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReadStatDto[]> {
    return await this.newsletterService.findReadStats(id);
  }

  @FindReadStatsPaginatedDocs()
  @Get(':id/stats/paginated')
  async findReadStatsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ReadStatDto>> {
    return await this.newsletterService.findReadStatsPaginated(id, query);
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

  @MarkAsReadDocs()
  @Public()
  @Patch(':id/parents/:parentId/read')
  async markAsRead(
    @Param('id', ParseIntPipe) newsletterId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<void> {
    return await this.newsletterService.markAsRead(newsletterId, parentId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteNewsletterDocs()
  @Delete(':id')
  async deleteNewsletter(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.delete(id);
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
