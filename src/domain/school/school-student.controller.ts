import { Faker, ko } from '@faker-js/faker';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { StudentStatus } from 'src/common/enums';
import { ResponseSchoolGradesDto } from 'src/domain/school/dto/response-school-grades.dto';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { SchoolStudentService } from './school-student.service';
import {
  CreateSchoolStudentBulkDocs,
  CreateSchoolStudentExcelUploadDocs,
  CreateSchoolStudentsBulkDryRunDocs,
  DownloadSchoolStudentExcelDocs,
  SchoolStudentGradesDocs,
  SchoolStudentListDocs,
  SchoolStudentListPaginatedDocs,
} from './swagger/school-student.swagger.decorator';

@ApiTags('✳️ Schools > Students ( 학교 > 학생 )')
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
  ): Promise<number> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  @CreateSchoolStudentsBulkDryRunDocs()
  @Post(':schoolId/students/bulk/dryrun')
  async bulkDryRun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<Student[]> {
    return await this.schoolStudentService.createBulkDryrun(schoolId, dtos);
  }

  @CreateSchoolStudentExcelUploadDocs()
  @Post(':schoolId/students/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStudents(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<number> {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }
    const dtos = await this.schoolStudentService.parseExcel(schoolId, file);
    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  // ------------------------------------------------------------------------ //

  @ApiOperation({ summary: '⚙️ to initialize table' })
  @Post(':schoolId/students/bulk/seed')
  async createBulkSeed(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<number | Student[]> {
    const koreanFaker = new Faker({ locale: [ko] });

    // 1-6학년, 각 학년당 4개 반, 각 반당 25명씩 생성
    const dtos: CreateStudentDto[] = [];

    for (let grade = 1; grade <= 6; grade++) {
      for (let classNum = 1; classNum <= 2; classNum++) {
        const classDtos: CreateStudentDto[] = [];

        for (let studentCode = 1; studentCode <= 20; studentCode++) {
          const firstName = koreanFaker.person.firstName();
          const lastName = koreanFaker.person.lastName();
          const koreanName = lastName + firstName;
          const parentPhone = this._parentPhone(
            grade,
            classNum,
            studentCode,
            koreanFaker.string.numeric(8),
          );

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

          classDtos.push(dto);
        }

        // 각 반의 20명 학생들을 name 기준으로 오름차순 정렬
        classDtos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // 정렬 후 studentCode를 1부터 20까지 순차적으로 재할당
        classDtos.forEach((dto, index) => {
          dto.studentCode = index + 1;
        });

        dtos.push(...classDtos);
      }
    }

    return await this.schoolStudentService.createBulk(schoolId, dtos);
  }

  private _parentPhone(
    grade: number,
    classNum: number,
    studentCode: number,
    random: string,
  ) {
    if (grade === 1 && classNum === 1 && studentCode === 1) {
      return '01089072911';
    }
    if (grade === 1 && classNum === 1 && studentCode === 2) {
      return '01094867415';
    }
    if (grade === 1 && classNum === 1 && studentCode === 3) {
      return '01020440571';
    }
    if (grade === 1 && classNum === 1 && studentCode === 4) {
      return '01093924027';
    }
    return `010${random}`;
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @DownloadSchoolStudentExcelDocs()
  @Get(':schoolId/students/download')
  async downloadStudents(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Res() res: Response,
  ) {
    const workbook = await this.schoolStudentService.generateExcel(schoolId);
    const date = new Date().toISOString().split('T')[0];

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="students-${date}.xlsx"`,
    );

    // 엑셀 파일을 response stream으로 작성
    await workbook.xlsx.write(res);
    res.end();
  }

  @SchoolStudentGradesDocs()
  @Get(':schoolId/students/grades')
  async getGradeClasses(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<ResponseSchoolGradesDto[]> {
    return await this.schoolStudentService.getGradeClasses(schoolId);
  }

  @SchoolStudentListDocs()
  @Get(':schoolId/students')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('grade') grade?: number,
    @Query('grades') grades?: string,
    @Query('attendingOnly') attendingOnly?: string,
  ): Promise<Student[]> {
    return await this.schoolStudentService.list(
      schoolId,
      grade ? Number(grade) : undefined,
      grades ? grades.split(',').map(Number) : undefined,
      attendingOnly ? attendingOnly === 'true' : undefined,
    );
  }

  @SchoolStudentListPaginatedDocs()
  @Public()
  @Get(':schoolId/students/paginated')
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.schoolStudentService.infiniteList(schoolId, query);
  }
}
