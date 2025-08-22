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
import { CreateRegistrationNewsletterDto } from 'src/domain/newsletter/dto/create-registration-newsletter.dto';
import { NewsletterDetailResponseDto } from 'src/domain/newsletter/dto/response-extended-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { GenerateS3UrlsDto } from './dto/generate-s3-urls.dto';
import { ResendNewsletterDto } from './dto/resend-newsletter.dto';
import { NewsletterService } from './newsletter.service';
import {
  CancelNewsletterDocs,
  CreateNewsletterDocs,
  DeleteNewsletterDocs,
  FindNewsletterByIdDocs,
  FindNewslettersDocs,
  FindNewslettersToBeSentDocs,
  FindRegistrationNewsletterDocs,
  GenerateNewsletterS3UrlsDocs,
  MarkAsReadDocs,
  ResendNewsletterDocs,
  UpdateNewsletterDocs,
} from './swagger/newsletter-swagger.decorator';

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
  create(@Body() dto: CreateNewsletterDto): Promise<Newsletter> {
    return this.newsletterService.create(dto);
  }

  @Post('registration')
  createRegistrationNewsletter(
    @Body() dto: CreateRegistrationNewsletterDto,
  ): Promise<Newsletter> {
    return this.newsletterService.createRegistrationNewsletter(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindNewslettersDocs()
  @Get()
  async find(
    @Query('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
    @Query('type') type?: NewsletterType,
  ): Promise<Newsletter[]> {
    return await this.newsletterService.find(schoolId, termId, type);
  }

  @FindRegistrationNewsletterDocs()
  @Get('registration')
  async findOnlyRegistration(
    @Query('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.findOnlyRegistration(schoolId, termId);
  }

  @FindNewslettersToBeSentDocs()
  @Get('to-be-sent')
  async findOnlyNewslettersToBeSent(): Promise<Newsletter[]> {
    return await this.newsletterService.findOnlyNewslettersToBeSent();
  }

  @FindNewsletterByIdDocs()
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NewsletterDetailResponseDto> {
    return await this.newsletterService.findDetail(id);
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

  @CancelNewsletterDocs()
  @Patch(':id/cancel')
  async cancelNewsletter(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.cancelNewsletter(id);
  }

  @ResendNewsletterDocs()
  @Patch(':id/resend')
  async resendNewsletter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResendNewsletterDto,
  ): Promise<Newsletter> {
    return await this.newsletterService.resendNewsletter(id, dto.scheduledAt);
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
    return await this.newsletterService.deleteNewsletter(id);
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
