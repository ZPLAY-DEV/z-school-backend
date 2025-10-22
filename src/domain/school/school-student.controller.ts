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
  constructor(private readonly schoolStudentService: SchoolStudentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateSchoolStudentsBulkDryRunDocs()
  @Post(':schoolId/students/bulk/dryrun')
  async createBulkDryrun(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<Student[]> {
    return await this.schoolStudentService.createBulkDryrun(schoolId, dtos);
  }

  @CreateSchoolStudentBulkDocs()
  @Post(':schoolId/students/bulk')
  async createBulk(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dtos: CreateStudentDto[],
  ): Promise<number> {
    return await this.schoolStudentService.createBulk(schoolId, dtos);
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
    const whitelist = [
      { id: 2, name: '김영희', phone: '01089072911' },
      { id: 3, name: '오진석', phone: '01094867415' },
      { id: 4, name: '제이슨', phone: '01020440571' },
      { id: 5, name: '김민지', phone: '01093924027' },
      { id: 6, name: '임승희', phone: '01020239567' },
      { id: 7, name: '기다은', phone: '01094183655' },
      { id: 8, name: '권서현', phone: '01065665090' },
      { id: 9, name: '김형필', phone: '01034693115' },
    ];

    // 1-6학년, 각 학년당 4개 반, 각 반당 25명씩 생성
    const dtos: CreateStudentDto[] = [];

    for (let grade = 1; grade <= 6; grade++) {
      for (let klass = 1; klass <= 2; klass++) {
        const classDtos: CreateStudentDto[] = [];

        for (let bunho = 1; bunho <= 20; bunho++) {
          const firstName = koreanFaker.person.firstName();
          const lastName = koreanFaker.person.lastName();
          const koreanName = lastName + firstName;
          const parentPhone = `010${koreanFaker.string.numeric(8)}`;

          const dto = new CreateStudentDto();
          dto.schoolId = schoolId;
          dto.grade = grade;
          dto.klass = klass.toString();
          dto.bunho = bunho;
          dto.name = koreanName;
          dto.phone = `010${koreanFaker.string.numeric(8)}`;
          dto.status = StudentStatus.ATTENDING;
          dto.parent = {
            phone: parentPhone,
            name: `${koreanName} 학부모`,
          };

          classDtos.push(dto);
        }

        // // 각 반의 20명 학생들을 name 기준으로 오름차순 정렬
        // classDtos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // // 정렬 후 bunho를 1부터 20까지 순차적으로 재할당
        // classDtos.forEach((dto, index) => {
        //   dto.bunho = index + 1;
        // });

        dtos.push(...classDtos);
      }
    }

    dtos[1].parent.phone = whitelist[0].phone;
    dtos[2].parent.phone = whitelist[1].phone;
    dtos[3].parent.phone = whitelist[2].phone;
    dtos[4].parent.phone = whitelist[3].phone;
    dtos[5].parent.phone = whitelist[4].phone;
    dtos[6].parent.phone = whitelist[5].phone;
    dtos[7].parent.phone = whitelist[6].phone;
    dtos[8].parent.phone = whitelist[7].phone;

    dtos[1].parent.name = `${whitelist[0].name} 학부모`;
    dtos[2].parent.name = `${whitelist[1].name} 학부모`;
    dtos[3].parent.name = `${whitelist[2].name} 학부모`;
    dtos[4].parent.name = `${whitelist[3].name} 학부모`;
    dtos[5].parent.name = `${whitelist[4].name} 학부모`;
    dtos[6].parent.name = `${whitelist[5].name} 학부모`;
    dtos[7].parent.name = `${whitelist[6].name} 학부모`;
    dtos[8].parent.name = `${whitelist[7].name} 학부모`;

    dtos[1].name = whitelist[0].name;
    dtos[2].name = whitelist[1].name;
    dtos[3].name = whitelist[2].name;
    dtos[4].name = whitelist[3].name;
    dtos[5].name = whitelist[4].name;
    dtos[6].name = whitelist[5].name;
    dtos[7].name = whitelist[6].name;
    dtos[8].name = whitelist[7].name;

    console.log(JSON.stringify(dtos, null, 2));

    return await this.schoolStudentService.createBulk(schoolId, dtos);
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

    // 한글 파일명을 URL 인코딩
    const filename = `학생목록-${date}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    // 헤더 설정
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
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
    @Query('grades') grades?: string,
    @Query('relations') relations?: string,
    @Query('attendingOnly') attendingOnly?: string,
  ): Promise<Student[]> {
    return await this.schoolStudentService.list(
      schoolId,
      grades ? grades.split(',').map(Number) : undefined,
      relations ? relations.split(',') : undefined,
      attendingOnly
        ? attendingOnly === 'true' || attendingOnly === '1'
        : undefined,
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
