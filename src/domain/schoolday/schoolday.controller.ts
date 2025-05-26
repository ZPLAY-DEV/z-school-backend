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
import { UpdateSchooldayDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayService } from './schoolday.service';

@Controller('schooldays')
export class SchooldayController {
  constructor(private readonly schooldayService: SchooldayService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 생성' })
  @Post()
  async create(): Promise<any> {
    return await this.schooldayService.create();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 리스트 w/ Pagination' })
  @Get()
  async findSchooldays(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Schoolday>> {
    return await this.schooldayService.findAll(query);
  }

  @ApiOperation({ description: 'Schoolday 상세보기' })
  @Get(':id')
  async findSchooldayById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Schoolday> {
    return await this.schooldayService.findById(id, ['grants', 'grants.user']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateSchooldayDto,
  ): Promise<Schoolday> {
    return await this.schooldayService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schooldayService.remove(id);
  }
}
