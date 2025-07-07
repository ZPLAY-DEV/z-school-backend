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
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import {
  CreateStudentDocs,
  CreateStudentDryRunDocs,
  FindStudentBookingsDocs,
  FindStudentByIdDocs,
  FindStudentCanceledGroupsDocs,
  FindStudentGroupsDocs,
  RemoveStudentDocs,
  UpdateStudentDocs,
} from 'src/domain/student/swagger/student-swagger.decorator';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateStudentDto } from './dto/create-student.dto';

@ApiTags('✅ Students ( 학생 )')
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

  @FindStudentByIdDocs()
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Student> {
    return await this.studentService.findById(id);
  }

  @Get(':id/schooldays')
  async findSchooldaysById(
    @Param('id') id: number,
    @Query('termId') termId?: number,
  ): Promise<Schoolday[]> {
    return await this.studentService.findSchooldaysById(id, termId);
  }

  @FindStudentBookingsDocs()
  @Get(':id/bookings')
  async findBookingsById(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Booking[]> {
    return await this.studentService.findBookingsById(id, termId);
  }

  @FindStudentGroupsDocs()
  @Get(':id/groups')
  async listGroups(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Group[]> {
    return await this.studentService.listGroups(id, termId);
  }

  @Get(':id/groups/paginated')
  async infiniteList(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginateQuery,
    @Query('termId') termId?: number,
  ): Promise<Paginated<Group>> {
    return await this.studentService.infiniteListGroups(id, query, termId);
  }

  @FindStudentCanceledGroupsDocs()
  @Get(':id/canceled-groups')
  async listCanceledGroups(
    @Param('id', ParseIntPipe) id: number,
    @Query('termId') termId?: number,
  ): Promise<Group[]> {
    return await this.studentService.listCanceledGroups(id, termId);
  }

  @Get(':id/canceled-groups/paginated')
  async infiniteListCanceledGroups(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginateQuery,
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
