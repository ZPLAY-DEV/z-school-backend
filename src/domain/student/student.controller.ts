import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingStatus } from 'src/common/enums';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';
import { StudentService } from 'src/domain/student/student.service';
import { UploadService } from 'src/services/upload/upload.service';
import { Booking } from '../booking/entities/booking.entity';
import { Group } from '../group/entities/group.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@ApiTags('✅ Students ( 학생 )')
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

  @ApiOperation({ description: 'Student 생성' })
  @Post()
  async create(@Body() dto: CreateStudentDto): Promise<Student> {
    return await this.studentService.create(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateStudentDto): Promise<Student | null> {
    return await this.studentService.dryRun(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? 학생 상세 정보 조회
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Student> {
    return await this.studentService.findById(id);
  }

  //? 수강중인 강좌 / 수강취소 강좌 조회
  @Get(':id/groups')
  async findByIdWithStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status', new ParseEnumPipe(BookingStatus)) status: BookingStatus,
  ): Promise<Group[]> {
    return await this.studentService.findByIdWithStatus(id, status);
  }

  // todo. 요일별 학생 수업 일정 조회. ( <= see if we need this. )

  //? 특정 학생의 수강 신청 내역 조회
  @Get(':id/bookings')
  async findBookings(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Booking[]> {
    return await this.studentService.findBookings(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Student 수정' })
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

  @ApiOperation({ description: 'Student 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<Student> {
    return await this.studentService.remove(id);
  }
}
