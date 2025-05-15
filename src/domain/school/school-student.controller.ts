import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { SchoolStudentService } from './school-student.service';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import {
  CreateSchoolStudentBulkDocs,
  SchoolStudentListDocs,
  SchoolStudentListPaginatedDocs,
} from '../student/swagger/school-student.swagger.decorator';
// import { UpdateStudentStatusDto } from '../student/dto/update-student-status.dto';

@ApiTags('✅ Schools - Students ( 학생관리 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('schools')
export class SchoolStudentController {
  constructor(
    private readonly schoolStudentService: SchoolStudentService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  // @CreateStudentDocs()
  // @Post(':schoolId/students')
  // async create(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Body() dto: CreateStudentDto,
  // ): Promise<Student> {
  //   return await this.schoolStudentService.create(dto, schoolId);
  // }

  @CreateSchoolStudentBulkDocs()
  @Post(':schoolId/students/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolStudentListPaginatedDocs()
  @Get(':schoolId/students/paginated')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.schoolStudentService.infiniteList(schoolId, query);
  }

  @SchoolStudentListDocs()
  @Get(':schoolId/students')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Student[]> {
    return await this.schoolStudentService.list(schoolId);
  }

  // @StudentDetailDocs()
  // @Get(':schoolId/students/:studentId')
  // async getStudentById(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Param('studentId', ParseIntPipe) studentId: number,
  // ): Promise<Student> {
  //   return await this.schoolStudentService.getStudentById(schoolId, studentId);
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//
  // @StudentStatusUpdateDocs()
  // @Patch(':schoolId/students/:studentId/status')
  // async updateStudentStatus(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Param('studentId', ParseIntPipe) studentId: number,
  //   @Body() dto: UpdateStudentStatusDto,
  // ): Promise<Student> {
  //   return await this.schoolStudentService.updateStudentStatus(
  //     schoolId,
  //     studentId,
  //     dto,
  //   );
  // }
}
