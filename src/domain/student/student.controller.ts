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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { DailyNextStopDto } from 'src/domain/student/dto/update-student-next-stop.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import {
  CreateStudentDocs,
  CreateStudentDryRunDocs,
  FindStudentBookingsDocs,
  FindStudentByIdDocs,
  FindStudentCanceledGroupsDocs,
  FindStudentCanceledGroupsPaginatedDocs,
  FindStudentGroupsDocs,
  FindStudentGroupsPaginatedDocs,
  FindStudentSchooldaysDocs,
  FindStudentsPaginatedDocs,
  RemoveStudentDocs,
  UpdateStudentDocs,
  UpdateStudentNextStopDocs,
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
  async create(@Body() dto: CreateStudentDto): Promise<Student> {
    return await this.studentService.create(dto);
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
  @Get(':id/terms')
  async getStudentTerms(
    @Param('id') id: number,
    @Query('filter') filter?: string,
  ): Promise<Term[]> {
    return await this.studentService.getStudentTerms(id, filter);
  }

  @FindStudentsPaginatedDocs()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.studentService.infiniteList(query);
  }

  @FindStudentByIdDocs()
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Student> {
    return await this.studentService.findById(id);
  }

  @FindStudentSchooldaysDocs()
  @Get(':id/schooldays')
  async getSchooldaysByDate(
    @Param('id') id: number,
    @Query('termId') termId?: number,
    @Query('date') date?: string,
  ): Promise<Schoolday[]> {
    return await this.studentService.getSchooldaysByDate(id, termId, date);
  }

  //! @deprecated
  @FindStudentBookingsDocs()
  @Get(':id/bookings')
  async findBookingsById(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Booking[]> {
    return await this.studentService.findBookingsById(id, termId);
  }

  //! @deprecated
  @FindStudentGroupsDocs()
  @Get(':id/groups')
  async listGroups(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Group[]> {
    return await this.studentService.listGroups(id, termId);
  }

  //! @deprecated
  @FindStudentGroupsPaginatedDocs()
  @Get(':id/groups/paginated')
  async infiniteListGroups(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
    @Query('termId') termId?: number,
  ): Promise<Paginated<Group>> {
    return await this.studentService.infiniteListGroups(id, query, termId);
  }

  //! @deprecated
  @FindStudentCanceledGroupsDocs()
  @Get(':id/canceled-groups')
  async listCanceledGroups(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Group[]> {
    return await this.studentService.listCanceledGroups(id, termId);
  }

  //! @deprecated
  @FindStudentCanceledGroupsPaginatedDocs()
  @Get(':id/canceled-groups/paginated')
  async infiniteListCanceledGroups(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
    @Query('termId') termId?: number,
  ): Promise<Paginated<Group>> {
    return await this.studentService.infiniteListCanceledGroups(
      id,
      query,
      termId,
    );
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @UpdateStudentNextStopDocs()
  @Patch(':id/escort')
  async updateEscortInfo(
    @Param('id') id: number,
    @Body() dtos: DailyNextStopDto[],
  ): Promise<Student> {
    return await this.studentService.updateEscortInfo(id, dtos);
  }

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
  async remove(@Param('id') id: number): Promise<Student> {
    return await this.studentService.remove(id);
  }
}
