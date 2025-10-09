import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayWithAttendanceDto } from 'src/domain/student/dto/schoolday-with-attendance.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import {
  CreateStudentDocs,
  CreateStudentDryRunDocs,
  FindByIdDocs,
  GetAllSchooldaysDocs,
  GetPaginatedStudentsDocs,
  GetSchooldayByDateDocs,
  GetStudentTermsDocs,
  RemoveStudentDocs,
  UpdateStudentDocs,
} from 'src/domain/student/swagger/student-swagger.decorator';
import { Term } from 'src/domain/term/entities/term.entity';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateStudentDto } from './dto/create-student.dto';

@ApiTags('✳️ Students ( 학생 )')
@Controller('students')
@UseInterceptors(ClassSerializerInterceptor)
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateStudentDocs()
  @Post()
  async create(
    @Body() dto: CreateStudentDto,
    @Res() res: Response,
  ): Promise<void> {
    const { student, isCreated } = await this.studentService.create(dto);

    if (isCreated) {
      res.status(HttpStatus.CREATED).json(student);
    } else {
      res.status(HttpStatus.OK).json(student);
    }
  }

  @CreateStudentDryRunDocs()
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateStudentDto): Promise<Student | null> {
    return await this.studentService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @GetStudentTermsDocs()
  @Get(':id/terms')
  async getStudentTerms(
    @Param('id') id: number,
    @Query('filter') filter?: string,
    // @Query('schoolId') schoolId?: number,
  ): Promise<Term[]> {
    return await this.studentService.getStudentTerms(id, filter);
  }

  @GetPaginatedStudentsDocs()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.studentService.infiniteList(query);
  }

  @FindByIdDocs()
  @Get(':id')
  async findById(
    @Param('id') id: number,
    @Query('termId') termId?: number,
  ): Promise<Student> {
    return await this.studentService.findById(id, termId);
  }

  @GetAllSchooldaysDocs()
  @Get(':id/all-schooldays')
  async getAllSchooldaysByTermId(
    @Param('id') id: number,
    @Query('termId') termId: number,
    @Query('month') month?: string, //! YYYY-MM
  ): Promise<Schoolday[]> {
    return await this.studentService.getAllSchooldays(id, termId, month);
  }

  @GetSchooldayByDateDocs()
  @Get(':id/schooldays')
  async getSchooldaysByDate(
    @Param('id') id: number,
    @Query('termId') termId: number,
    @Query('date') date: string,
  ): Promise<SchooldayWithAttendanceDto[]> {
    return await this.studentService.getSchooldaysByDate(id, termId, date);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @UpdateStudentDocs()
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    return await this.studentService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @RemoveStudentDocs()
  @Delete(':id')
  async remove(
    @Param('id') id: number,
    @Query('forceDelete') forceDelete?: string,
  ): Promise<Student> {
    const shouldForceDelete = forceDelete === 'true';
    return await this.studentService.remove(id, shouldForceDelete);
  }
}
