import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateCalendarDto } from 'src/domain/calendar/dto/update-calendar.dto';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { CalendarService } from './calendar.service';

@ApiTags('✅ Calendars ( 학사일정 )')
@Controller('calendars')
@UseInterceptors(ClassSerializerInterceptor)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({
    description: 'Calendar 수정',
    summary: '학사일정 수정',
  })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateCalendarDto,
  ): Promise<Calendar> {
    return await this.calendarService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Calendar> {
    return await this.calendarService.findById(id, ['school']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Calendar 삭제', summary: '학사일정 삭제' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.remove(id);
  }
}
