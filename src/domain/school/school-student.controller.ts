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
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { SchoolStudentService } from './school-student.service';

@Controller('schools')
export class SchoolStudentController {
  constructor(
    private readonly schoolStudentService: SchoolStudentService,
    private readonly uploadService: UploadService,
  ) {}

  //? ----------------------------------------------------------------------- //
  //? Create
  //? ----------------------------------------------------------------------- //

  @Post(':schoolId/students')
  @ApiOperation({ description: 'Student 생성' })
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateStudentDto,
  ): Promise<Student> {
    return await this.schoolStudentService.create({
      ...dto,
      schoolId,
    });
  }

  @Public()
  @ApiOperation({ description: 'Students 생성' })
  @Post(':schoolId/students/bulk')
  @HttpCode(200)
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  //? ----------------------------------------------------------------------- //
  //? Read
  //? ----------------------------------------------------------------------- //

  @Public()
  @ApiOperation({ description: 'Student 리스트 w/ Pagination' })
  @PaginateQueryOptions()
  @Get(':schoolId/students/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.schoolStudentService.infiniteList(schoolId, query);
  }

  @Public()
  @ApiOperation({ description: 'Student 리스트 (all)' })
  @PaginateQueryOptions()
  @Get(':schoolId/students')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Student[]> {
    return await this.schoolStudentService.list(schoolId);
  }
}
