import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
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
  CreateInstructorDocs,
  CreateInstructorDocsBulkDocs,
  InstructorDocumentsListDocs,
  InstructorListDocs,
  InstructorListPaginatedDocs,
  SoftDeleteInstructorSchoolDocs,
} from '../instructor/swagger/rest-swagger.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { DeleteInstructorSchoolDto } from '../instructor/dto/delete-instructor-school.dto';
import { Document } from 'src/domain/document/entities/document.entity';
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Schools > Instructors ( 학교 > 강사 )')
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
  @CreateInstructorDocs()
  @Post(':schoolId/instructors')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateInstructorDto,
  ): Promise<Instructor> {
    return await this.schoolInstructorService.create(schoolId, dto);
  }

  @CreateInstructorDocsBulkDocs()
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
  @InstructorListDocs()
  @Get(':schoolId/instructors')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Instructor[]> {
    return await this.schoolInstructorService.list(schoolId);
  }

  @InstructorListPaginatedDocs()
  @Get(':schoolId/instructors/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Instructor>> {
    return await this.schoolInstructorService.infiniteList(schoolId, query);
  }

  @InstructorDocumentsListDocs()
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

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
  @SoftDeleteInstructorSchoolDocs()
  @Delete(':schoolId/instructors/:instructorId')
  async delete(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('instructorId', ParseIntPipe) instructorId: number,
    @Body() dto: DeleteInstructorSchoolDto,
  ): Promise<void> {
    return await this.schoolInstructorService.softDelete(
      schoolId,
      instructorId,
      dto,
    );
  }
}
