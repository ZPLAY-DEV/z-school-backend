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
import { PlatformType, StudentStatus } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
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
// import { UpdateStudentStatusDto } from '../student/dto/update-student-status.dto';

@ApiTags('✅ Schools > Students ( 학생관리 )')
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
  @CreateSchoolStudentBulkDocs()
  @Post(':schoolId/students/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number | Student[]> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  @ApiOperation({ summary: 'seed data ⚙️ DB 초기화때 사용' })
  @Post(':schoolId/students/bulk/seed')
  async createBulkSeed(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number | Student[]> {
    const koreanFaker = new Faker({ locale: [ko] });

    // 100개의 학생 DTO 생성
    const dtos: CreateStudentDto[] = Array.from({ length: 100 }, (_, i) => {
      const firstName = koreanFaker.person.firstName();
      const lastName = koreanFaker.person.lastName();
      const koreanName = lastName + firstName;
      const parentPhone = `010${koreanFaker.string.numeric(8)}`;

      const dto = new CreateStudentDto();
      dto.schoolId = schoolId;
      dto.grade = koreanFaker.helpers.arrayElement([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ]);
      dto.class = koreanFaker.helpers.arrayElement(['1', '2', '3', '4']);
      dto.studentCode = i + 1;
      dto.name = koreanName;
      dto.phone = `010${koreanFaker.string.numeric(8)}`;
      dto.status = StudentStatus.ATTENDING;
      dto.parent = {
        phone: parentPhone,
        platform: koreanFaker.helpers.arrayElement([
          PlatformType.ANDROID,
          PlatformType.IOS,
          PlatformType.WEB,
        ]),
      };

      return dto;
    });

    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
  @CreateSchoolStudentsBulkDryRunDocs()
  @Post(':schoolId/students/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number | Student[]> {
    return await this.schoolStudentService.createBulk(schoolId, dtos, true);
  }

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
