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
import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { UploadService } from 'src/services/upload/upload.service';
import {
  CreateSchoolSamBulkDocs,
  CreateSchoolSamBulkDryRunDocs,
  SchoolSamListDocs,
  SchoolSamPaginatedDocs,
} from '../sam/swagger/school-sam.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Schools > Sams ( 학교 > 강사 )')
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

  @CreateSchoolSamBulkDocs()
  @Post(':schoolId/sams/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolSamBulkDryRunDocs()
  @HttpCode(StatusCodes.OK)
  @Post(':schoolId/sams/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos, true);
  }

  @SchoolSamListDocs()
  @Get(':schoolId/sams')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Sam[]> {
    return await this.schoolSamService.list(schoolId);
  }

  @SchoolSamPaginatedDocs()
  @Get(':schoolId/sams/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Sam>> {
    return await this.schoolSamService.infiniteList(schoolId, query);
  }

  // @SchoolSamDocumentsDocs()
  // @Get(':schoolId/sams/:samId/documents')
  // async getDocuments(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Param('samId', ParseIntPipe) samId: number,
  // ): Promise<Document[]> {
  //   return await this.schoolSamService.getDocuments(schoolId, samId);
  // }
}
