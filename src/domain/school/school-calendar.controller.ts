import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SchoolCalendarService } from 'src/domain/school/school-calendar.service';

@Controller('schools')
export class SchoolCalendarController {
  constructor(private readonly schoolCalendarService: SchoolCalendarService) {}

  //? ----------------------------------------------------------------------- //
  //? Create
  //? ----------------------------------------------------------------------- //

  @Post(':schoolId/calendars')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<any> {
    return await this.schoolCalendarService.create(schoolId);
  }

  //? ----------------------------------------------------------------------- //
  //? Read
  //? ----------------------------------------------------------------------- //
}
