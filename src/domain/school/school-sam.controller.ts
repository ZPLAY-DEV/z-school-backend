import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Document } from 'src/domain/document/entities/document.entity';
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Schools > Instructors ( 학교 > 강사 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolSamController {
  constructor(
    private readonly schoolSamService: SchoolSamService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post(':schoolId/instructors/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @HttpCode(StatusCodes.OK)
  @Post(':schoolId/instructors/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos, true);
  }

  @Get(':schoolId/sams')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Sam[]> {
    return await this.schoolSamService.list(schoolId);
  }

  @Get(':schoolId/sams/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Sam>> {
    return await this.schoolSamService.infiniteList(schoolId, query);
  }

  @Get(':schoolId/sams/:samId/documents')
  async getDocuments(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<Document[]> {
    return await this.schoolSamService.getDocuments(schoolId, samId);
  }
}
