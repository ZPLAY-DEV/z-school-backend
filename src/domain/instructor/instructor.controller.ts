import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { DeleteInstructorNoteDto } from 'src/domain/instructor/dto/delete-instructor-note.dto';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { InstructorService } from 'src/domain/instructor/instructor.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Instructor } from './entities/instructor.entity';
import { SoftDeleteSchoolInstructorDocs } from './swagger/instructor.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Instructors ( 강사; equivalent to Parent )')
@ApiCommonErrorResponseTemplate()
@Controller('instructors')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  async create(@Body() dto: CreateInstructorDto): Promise<Instructor> {
    return await this.instructorService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':id')
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

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructorDto,
  ) {
    return await this.instructorService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @SoftDeleteSchoolInstructorDocs()
  @Delete(':id')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteInstructorNoteDto,
  ): Promise<void> {
    return await this.instructorService.softDelete(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? NOT USED YET
  //? ---------------------------------------------------------------------- ?//

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a instructor' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'The instructor has been successfully deleted.',
  // })
  // @ApiResponse({ status: 404, description: 'Instructor not found.' })
  // async remove(@Param('id', ParseIntPipe) id: number) {
  //   return await this.instructorService.remove(id);
  // }

  // @Get('/paginated')
  // @ApiOperation({ summary: 'Get all instructors (paginated)' })
  // async infiniteList(
  //   @Paginate() query: PaginateQuery,
  // ): Promise<Paginated<Instructor>> {
  //   return await this.instructorService.infiniteList(query);
  // }

  // @Get()
  // @ApiOperation({ summary: 'Get all instructors (paginated)' })
  // async list(@Query('name') name: string): Promise<Instructor[]> {
  //   return await this.instructorService.list(name);
  // }
}
