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
import { Public } from 'src/common/decorators/public.decorator';
import { NewsletterType } from 'src/common/enums';
import { IS3Urls } from 'src/common/interfaces';
import { CreateDispatchDto } from 'src/domain/newsletter/dto/create-dispatch.dto';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { GenerateS3UrlsDto } from 'src/domain/newsletter/dto/generate-s3-urls.dto';
import { NewsletterWithReadStatsDto } from 'src/domain/newsletter/dto/newsletter-with-read-stats.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Dispatch } from 'src/domain/newsletter/entities/dispatch.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import {
  CreateNewsletterDocs,
  DeleteNewsletterDocs,
  FindNewsletterByIdDocs,
  FindPendingDispatchesDocs,
  FindRegistrationNewsletterDocs,
  GenerateNewsletterS3UrlsDocs,
  ListNewslettersDocs,
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
  createNewsletter(
    @Body() dto: CreateNewsletterDto & CreateDispatchDto,
  ): Promise<Newsletter> {
    return this.newsletterService.createNewsletter(dto);
  }

  @SendNewsletterDocs()
  @Post(':id/send')
  sendNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDispatchDto,
  ): Promise<Dispatch> {
    return this.newsletterService.sendNewsletter(id, dto);
  }

  @ResendNewsletterDocs()
  @Post(':id/resend/:uuid')
  resendNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Param('uuid') uuid: string,
  ): Promise<void> {
    return this.newsletterService.resendNewsletter(id, uuid);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ListNewslettersDocs()
  @Get()
  async list(
    @Query('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
    @Query('type') type?: NewsletterType,
  ): Promise<Newsletter[]> {
    return await this.newsletterService.list(schoolId, termId, type);
  }

  @FindRegistrationNewsletterDocs()
  @Get('registration-links')
  async findRegistrationNewsletter(
    @Query('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.findRegistrationNewsletter(
      schoolId,
      termId,
    );
  }

  @FindPendingDispatchesDocs()
  @Get('pending-dispatches')
  async findPendingDispatches(): Promise<Dispatch[]> {
    return await this.newsletterService.findPendingDispatches();
  }

  @FindNewsletterByIdDocs()
  @Get(':id')
  async findDetailById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NewsletterWithReadStatsDto> {
    return await this.newsletterService.findDetailById(id);
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
