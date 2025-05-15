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
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { SchoolInstructorService } from 'src/domain/school/school-instructor.service';
import { UploadService } from 'src/services/upload/upload.service';
import {
  CreateSchoolInstructorBulkDocs,
  CreateSchoolInstructorsBulkDryRunDocs,
  SchoolInstructorDocumentsListDocs,
  SchoolInstructorListDocs,
  SchoolInstructorListPaginatedDocs,
} from '../instructor/swagger/school-instructor.swagger.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Document } from 'src/domain/document/entities/document.entity';
import { StatusCodes } from 'http-status-codes';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Schools > Instructors ( 학교 > 강사 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
export class SchoolInstructorController {
  constructor(
    private readonly schoolInstructorService: SchoolInstructorService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolInstructorBulkDocs()
  @Post(':schoolId/instructors/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateInstructorDto[],
  ): Promise<Instructor[]> {
    return await this.schoolInstructorService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @HttpCode(StatusCodes.OK)
  @CreateSchoolInstructorsBulkDryRunDocs()
  @Post(':schoolId/instructors/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateInstructorDto[],
  ): Promise<Instructor[]> {
    return await this.schoolInstructorService.createBulk(schoolId, dtos, true);
  }

  @SchoolInstructorListDocs()
  @Get(':schoolId/instructors')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Instructor[]> {
    return await this.schoolInstructorService.list(schoolId);
  }

  @SchoolInstructorListPaginatedDocs()
  @Get(':schoolId/instructors/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Instructor>> {
    return await this.schoolInstructorService.infiniteList(schoolId, query);
  }

  @SchoolInstructorDocumentsListDocs()
  @Get(':schoolId/instructors/:instructorId/documents')
  async getDocuments(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('instructorId', ParseIntPipe) instructorId: number,
  ): Promise<Document[]> {
    return await this.schoolInstructorService.getDocuments(
      schoolId,
      instructorId,
    );
  }
}
