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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { CreateNewsletterDto } from 'src/domain/newsletter/dto/create-newsletter.dto';
import { UpdateNewsletterDto } from 'src/domain/newsletter/dto/update-newsletter.dto';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { NewsletterService } from 'src/domain/newsletter/newsletter.service';
import {
  CreateNewsletterDocs,
  DeleteNewsletterDocs,
  FindNewsletterByIdDocs,
  GenerateNewsletterS3UrlsDocs,
  MarkAsReadByParentDocs,
  MarkAsReadByStudentDocs,
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

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindNewsletterByIdDocs()
  @Get(':id')
  async findDetailById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Newsletter> {
    return await this.newsletterService.findById(id);
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

  @MarkAsReadByParentDocs()
  @Public()
  @Patch(':id/parents/:parentId/read')
  async markAsReadByParent(
    @Param('id', ParseIntPipe) newsletterId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<void> {
    return await this.newsletterService.markAsReadByParent(
      newsletterId,
      parentId,
    );
  }

  @MarkAsReadByStudentDocs()
  @Public()
  @Patch(':id/students/:studentId/read')
  async markAsReadByStudent(
    @Param('id', ParseIntPipe) newsletterId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<void> {
    await this.newsletterService.markAsReadByStudent(newsletterId, studentId);
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
  async generateS3Urls(
    @Body()
    dto: {
      schoolId: number;
      termId: number;
      mimeType: string;
      filename?: string;
    },
  ): Promise<IS3Urls> {
    const path = [
      `schools`,
      `${dto.schoolId}`,
      `terms`,
      `${dto.termId}`,
      `newsletters`,
    ].join('/');
    return await this.uploadService.generateUploadUrls(
      path,
      dto.mimeType,
      dto.filename,
    );
  }
}
