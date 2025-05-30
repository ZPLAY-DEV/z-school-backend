import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { IAttendance } from 'src/domain/attendance/entities/attendance.interface';
import { LessonAttendanceService } from 'src/domain/lesson/lesson-attendance.service';
import { FindAttendanceByDateDocs } from 'src/domain/lesson/swagger/lesson-attendance-swagger.decorator';

@ApiTags('✅ Lessons > Attendance ( 과목 > 출석부 조회 )')
@ApiCommonErrorResponseTemplate()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('lessons')
export class LessonAttendanceController {
  constructor(
    private readonly lessonAttendancesService: LessonAttendanceService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? FIND BY DATE
  //? ---------------------------------------------------------------------- ?//

  @FindAttendanceByDateDocs()
  @Get(':lessonId/attendances/:date')
  async findByDate(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('date') date: string,
  ): Promise<IAttendance[]> {
    return await this.lessonAttendancesService.findByDate(lessonId, date);
  }
}
