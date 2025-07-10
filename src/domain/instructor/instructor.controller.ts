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
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { InstructorService } from 'src/domain/instructor/instructor.service';
import { Instructor } from './entities/instructor.entity';
import {
  FindAllInstructorDocs,
  FindInstructorByIdDocs,
  SoftDeleteSchoolInstructorDocs,
  UpdateInstructorDocs,
} from './swagger/instructor.swagger.decorator';

@ApiTags('✳️ Instructors ( 강사 )')
@Controller('instructors')
@UseInterceptors(ClassSerializerInterceptor)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindAllInstructorDocs()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Instructor>> {
    return this.instructorService.infiniteList(query);
  }

  @FindInstructorByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Instructor> {
    return await this.instructorService.findById(id, ['user', 'sams']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateInstructorDocs()
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
    @Body('note') note?: string,
  ): Promise<void> {
    return await this.instructorService.remove(id, note);
  }
}
