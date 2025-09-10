import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
// import { IWeeklySchedule } from 'src/common/interfaces';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
// import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { ResponseSchoolTermStudentBookingsDto } from './dto/response-school-term-student-bookings.dto';
import {
  ResponseSchooldayItemDto,
  ResponseWeeklySchooldayDto,
} from './dto/response-student-schoolday.dto';
import {
  SchoolTermStudentBookingsDocs,
  SchoolTermStudentBookingStatsDocs,
  SchoolTermStudentCanceledGroupsDocs,
  SchoolTermStudentCanceledGroupsPaginatedDocs,
  SchoolTermStudentGroupsDocs,
  SchoolTermStudentGroupsPaginatedDocs,
  SchoolTermStudentListDocs,
  SchoolTermStudentSchooldaysDocs,
  SchoolTermStudentWeeklySchooldaysDocs,
} from './swagger/school-term-student-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Students ( 학교 > 학기 > 학생 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermStudentController {
  constructor(
    private readonly schoolTermStudentService: SchoolTermStudentService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermStudentListDocs()
  @Public()
  @Get(':schoolId/terms/:termId/students')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Student[]> {
    return await this.schoolTermStudentService.list(schoolId, termId);
  }

  @SchoolTermStudentBookingsDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/bookings')
  @UseInterceptors(ClassSerializerInterceptor)
  async listBookings(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<ResponseSchoolTermStudentBookingsDto[]> {
    return await this.schoolTermStudentService.listBookings(
      schoolId,
      termId,
      studentId,
    );
  }

  @SchoolTermStudentBookingStatsDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/booking-stats')
  @UseInterceptors(ClassSerializerInterceptor)
  async listBookingStats(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Record<string, Offering[]>> {
    return await this.schoolTermStudentService.listBookingStats(
      schoolId,
      termId,
      studentId,
    );
  }

  @SchoolTermStudentSchooldaysDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/schooldays')
  async listSchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<ResponseSchooldayItemDto[]> {
    return await this.schoolTermStudentService.listSchooldays(
      schoolId,
      termId,
      studentId,
    );
  }

  @SchoolTermStudentWeeklySchooldaysDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/weekly-schooldays')
  async listWeeklySchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('date') date?: string,
  ): Promise<ResponseWeeklySchooldayDto> {
    return await this.schoolTermStudentService.listWeeklySchooldays(
      schoolId,
      termId,
      studentId,
      date,
    );
  }

  @SchoolTermStudentGroupsDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/groups')
  async listGroups(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Group[]> {
    return await this.schoolTermStudentService.listGroups(
      schoolId,
      termId,
      studentId,
    );
  }

  @Get(':schoolId/terms/:termId/students/:studentId/weekly-groups')
  async listGroupsWeekly(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Record<string, Group[]>> {
    return await this.schoolTermStudentService.listGroupsWeekly(
      schoolId,
      termId,
      studentId,
    );
  }

  @SchoolTermStudentGroupsPaginatedDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/groups/paginated')
  async infiniteListGroups(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    return await this.schoolTermStudentService.infiniteListGroups(
      schoolId,
      termId,
      studentId,
      query,
    );
  }

  @SchoolTermStudentCanceledGroupsDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/canceled-groups')
  async listCanceledGroups(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Group[]> {
    return await this.schoolTermStudentService.listCanceledGroups(
      schoolId,
      termId,
      studentId,
    );
  }

  @SchoolTermStudentCanceledGroupsPaginatedDocs()
  @Get(':schoolId/terms/:termId/students/:studentId/canceled-groups/paginated')
  async infiniteListCanceledGroups(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Group>> {
    return await this.schoolTermStudentService.infiniteListCanceledGroups(
      schoolId,
      termId,
      studentId,
      query,
    );
  }
}
