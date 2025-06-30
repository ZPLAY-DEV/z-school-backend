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
import { UpdateInstructorDto } from 'src/domain/instructor/dto/update-instructor.dto';
import { InstructorService } from 'src/domain/instructor/instructor.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Instructor } from './entities/instructor.entity';
import {
  CreateInstructorSimpleDocs,
  FindInstructorByIdDocs,
  SoftDeleteSchoolInstructorDocs,
  UpdateInstructorDocs,
} from './swagger/instructor.swagger.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('✅ Instructors ( 강사 ≓ Parent )')
@Controller('instructors')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateInstructorSimpleDocs()
  @Post()
  async create(@Body() dto: CreateInstructorDto): Promise<Instructor> {
    return await this.instructorService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

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
    return await this.instructorService.softDelete(id, note);
  }
}
