import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { InstructorService } from 'src/domain/instructor/instructor.service';
import { Instructor } from './entities/instructor.entity';

@Controller('instructors')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @Get('/paginated')
  @ApiOperation({ summary: 'Get all instructors (paginated)' })
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Instructor>> {
    return await this.instructorService.infiniteList(query);
  }

  @Get()
  @ApiOperation({ summary: 'Get all instructors (paginated)' })
  async list(@Query('name') name: string): Promise<Instructor[]> {
    return await this.instructorService.list(name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support by id' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Instructor> {
    return await this.instructorService.findById(id, [
      'user',
      'documents',
      'groups',
      'schools',
      'instructorLessons',
      'instructorLessons.lesson',
    ]);
  }

  //* ---------------------------------------------------------------------- *//
  //* Update
  //* ---------------------------------------------------------------------- *//

  @Patch(':id')
  @ApiOperation({ summary: 'Update a instructor' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructorDto,
  ) {
    return await this.instructorService.update(id, dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Delete
  //* ---------------------------------------------------------------------- *//

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a instructor' })
  @ApiResponse({
    status: 200,
    description: 'The instructor has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Instructor not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.instructorService.remove(id);
  }
}
