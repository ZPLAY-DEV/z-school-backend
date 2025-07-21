import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

import { CreateSamDto } from 'src/domain/sam/dto/create-sam.dto';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolSamService } from 'src/domain/school/school-sam.service';
import { UploadService } from 'src/services/upload/upload.service';
import {
  CreateSchoolSamBulkDocs,
  CreateSchoolSamBulkDryRunDocs,
  SchoolSamListDocs,
  SchoolSamPaginatedDocs,
} from './swagger/school-sam.swagger.decorator';

@ApiTags('✳️ Schools > Sams ( 학교 > 담임쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolSamController {
  constructor(
    private readonly schoolSamService: SchoolSamService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  // todo. see if it works
  @CreateSchoolSamBulkDocs()
  @Post(':schoolId/sams/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos);
  }

  @CreateSchoolSamBulkDryRunDocs()
  @HttpCode(StatusCodes.OK)
  @Post(':schoolId/sams/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateSamDto[],
  ): Promise<Sam[]> {
    return await this.schoolSamService.createBulk(schoolId, dtos, true);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

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
    @Paginate() query: PaginateQuery,
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
  ): Promise<Paginated<Sam>> {
    return await this.schoolSamService.infiniteList(query, schoolId, termId);
  }
}
// {{hostname}}/v1/schools/1/sams/3/dates
