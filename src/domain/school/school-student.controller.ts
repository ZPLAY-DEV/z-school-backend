import { Faker, ko } from '@faker-js/faker';
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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { StudentStatus } from 'src/common/enums';

import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { UploadService } from 'src/services/upload/upload.service';
import {
  CreateSchoolStudentBulkDocs,
  CreateSchoolStudentsBulkDryRunDocs,
  SchoolStudentListDocs,
  SchoolStudentListPaginatedDocs,
} from '../student/swagger/school-student.swagger.decorator';
import { SchoolStudentService } from './school-student.service';

@ApiTags('✅ Schools > Students ( 학생관리 )')
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

  @CreateSchoolStudentBulkDocs()
  @Post(':schoolId/students/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number | Student[]> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  @CreateSchoolStudentsBulkDryRunDocs()
  @Post(':schoolId/students/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number | Student[]> {
    return await this.schoolStudentService.createBulk(schoolId, dtos, true);
  }

  @ApiOperation({ summary: 'seed data ⚙️ DB 초기화때 사용' })
  @Post(':schoolId/students/bulk/seed')
  async createBulkSeed(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number | Student[]> {
    const koreanFaker = new Faker({ locale: [ko] });

    // 1-6학년, 각 학년당 4개 반, 각 반당 25명씩 생성
    const dtos: CreateStudentDto[] = [];

    for (let grade = 1; grade <= 6; grade++) {
      for (let classNum = 1; classNum <= 4; classNum++) {
        for (let studentCode = 1; studentCode <= 25; studentCode++) {
          const firstName = koreanFaker.person.firstName();
          const lastName = koreanFaker.person.lastName();
          const koreanName = lastName + firstName;
          const parentPhone = `010${koreanFaker.string.numeric(8)}`;

          const dto = new CreateStudentDto();
          dto.schoolId = schoolId;
          dto.grade = grade;
          dto.class = classNum.toString();
          dto.studentCode = studentCode;
          dto.name = koreanName;
          dto.phone = `010${koreanFaker.string.numeric(8)}`;
          dto.status = StudentStatus.ATTENDING;
          dto.parent = {
            phone: parentPhone,
          };

          dtos.push(dto);
        }
      }
    }

    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':schoolId/students/grades')
  async getGradeClasses(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<{ grade: number; classes: string[] }[]> {
    return await this.schoolStudentService.getGradeClasses(schoolId);
  }

  @SchoolStudentListPaginatedDocs()
  @Get(':schoolId/students/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.schoolStudentService.infiniteList(schoolId, query);
  }

  @SchoolStudentListDocs()
  @Get(':schoolId/students')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Student[]> {
    return await this.schoolStudentService.list(schoolId);
  }
}
