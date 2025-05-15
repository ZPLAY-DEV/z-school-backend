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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { InstructorService } from 'src/domain/instructor/instructor.service';
import { Instructor } from './entities/instructor.entity';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import {
  CreateInstructorDocs,
  InstructorDryRunDocs,
  SoftDeleteSchoolInstructorDocs,
} from './swagger/instructor.swagger.decorator';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { DeleteInstructorSchoolDto } from './dto/delete-instructor-school.dto';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Instructors ( 강사 )')
@ApiCommonErrorResponseTemplate()
@Controller('instructors')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//
  @CreateInstructorDocs()
  @Post()
  async create(@Body() dto: CreateInstructorDto): Promise<Instructor> {
    return await this.instructorService.create(dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Read
  //* ---------------------------------------------------------------------- *//

  @InstructorDryRunDocs()
  @HttpCode(HttpStatus.OK)
  @Post('dryrun')
  async dryRun(@Body() dto: CreateInstructorDto): Promise<Instructor | null> {
    return await this.instructorService.dryRun(dto);
  }

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

  //* ---------------------------------------------------------------------- *//
  //* Update
  //* ---------------------------------------------------------------------- *//

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructorDto,
  ) {
    return await this.instructorService.update(id, dto);
  }

  //* ---------------------------------------------------------------------- *//
  //* Delete
  //* ---------------------------------------------------------------------- *//
  @SoftDeleteSchoolInstructorDocs()
  @Delete(':id')
  async softDeleteSchoolInstructor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteInstructorSchoolDto,
  ): Promise<void> {
    return await this.instructorService.softDeleteSchoolInstructor(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? NOT USED YET
  //?-------------------------------------------------------------------------//

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
