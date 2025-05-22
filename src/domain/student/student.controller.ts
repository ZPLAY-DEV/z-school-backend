import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import {
  CreateStudentDocs,
  StudentDryRunDocs,
  StudentFindByIdDocs,
  StudentStatusUpdateDocs,
  StudentUpdateDocs,
} from './swagger/student.swagger.decorator';

@ApiTags('✅ Students ( 학생 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @CreateStudentDocs()
  @ApiOperation({ description: 'Student 생성' })
  @Post()
  async create(@Body() dto: CreateStudentDto): Promise<Student> {
    return await this.studentService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @StudentDryRunDocs()
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateStudentDto): Promise<Student | null> {
    return await this.studentService.dryRun(dto);
  }

  @StudentFindByIdDocs()
  @Get(':id')
  async getStudentById(@Param('id') id: number): Promise<Student> {
    return await this.studentService.findById(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//
  @StudentUpdateDocs()
  @ApiOperation({ description: 'Student 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    return await this.studentService.update(id, dto);
  }

  @StudentStatusUpdateDocs()
  @Patch(':schoolId/students/:studentId/status')
  async updateStudentStatus(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateStudentStatusDto,
  ): Promise<Student> {
    return await this.studentService.updateStudentStatus(
      schoolId,
      studentId,
      dto,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Student 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Student> {
    return await this.studentService.remove(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? NOT USED
  //? ---------------------------------------------------------------------- ?//

  // @ApiOperation({ description: '이미지 URL 생성' })
  // @Post(':id/s3urls')
  // async generateS3Urls(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body('mime') mime: string,
  // ): Promise<IS3Urls> {
  //   return await this.uploadService.generateStudentImageUrls(id, mime);
  // }

  // @ApiOperation({ description: 'Student 이미지 삭제' })
  // @Post('/image/delete')
  // async deleteImages(@Body('url') url: string): Promise<void> {
  //   return await this.studentService.deleteImages(url);
  // }

  // @ApiOperation({ description: 'Student 리스트 w/ Pagination' })
  // @Public()
  // @Get('paginated')
  // async getAdminStudent(
  //   @Paginate() query: PaginateQuery,
  // ): Promise<Paginated<Student>> {
  //   return await this.studentService.findAll(query);
  // }

  // @ApiOperation({ description: 'Student 리스트 w/ Pagination' })
  // @Public()
  // @Get()
  // async getStudent(
  //   @Paginate() query: PaginateQuery,
  // ): Promise<Paginated<Student>> {
  //   const activeQuery = {
  //     ...query,
  //     filter: {
  //       isActive: '1',
  //     },
  //   };
  //   return await this.studentService.findAll(activeQuery);
  // }

  // @ApiOperation({ description: '모든 active 배너 리스트' })
  // @Public()
  // @Get('active')
  // async getActiveStudent(): Promise<Student[]> {
  //   return await this.studentService.findActive();
  // }
}
