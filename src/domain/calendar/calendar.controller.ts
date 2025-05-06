import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { UpdateCalendarDto } from 'src/domain/calendar/dto/update-calendar.dto';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { CalendarService } from './calendar.service';

@Controller('calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Calendar 생성' })
  @Post()
  async create(): Promise<any> {
    return await this.calendarService.create();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Calendar 리스트 w/ Pagination' })
  
  @Get()
  async findCalendars(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Calendar>> {
    return await this.calendarService.findAll(query);
  }

  @ApiOperation({ description: 'Calendar 상세보기' })
  @Get(':id')
  async findCalendarById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Calendar> {
    return await this.calendarService.findById(id, ['grants', 'grants.user']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Calendar 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateCalendarDto,
  ): Promise<Calendar> {
    return await this.calendarService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.remove(id);
  }
}
