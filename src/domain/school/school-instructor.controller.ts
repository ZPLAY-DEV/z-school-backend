import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateInstructorDto } from 'src/domain/instructor/dto/create-instructor.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { SchoolInstructorService } from 'src/domain/school/school-instructor.service';
import { UploadService } from 'src/services/upload/upload.service';

@Controller('schools')
export class SchoolInstructorController {
  constructor(
    private readonly schoolInstructorService: SchoolInstructorService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post(':schoolId/instructors')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateInstructorDto,
  ): Promise<Instructor> {
    return await this.schoolInstructorService.create(schoolId, dto);
  }

  // @Public()
  // @ApiOperation({ description: 'Instructor 생성' })
  // @Post(':schoolId/instructors/bulk')
  // @HttpCode(200)
  // async createBulk(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Body() dtos: CreateInstructorDto[],
  // ): Promise<number> {
  //   return await this.schoolInstructorService.createBulk(schoolId, dtos);
  // }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // @Public()
  // @ApiOperation({ description: 'Instructor 리스트 w/ Pagination' })
  // @PaginateQueryOptions()
  // @Get(':schoolId/instructors/paginated')
  // @UseInterceptors(ClassSerializerInterceptor)
  // async list(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Paginate() query: PaginateQuery,
  // ): Promise<Paginated<Instructor>> {
  //   return await this.schoolInstructorService.infiniteList(schoolId, query);
  // }

  // @Public()
  // @ApiOperation({ description: 'Instructor 리스트 (all)' })
  // @PaginateQueryOptions()
  // @Get(':schoolId/instructors')
  // @UseInterceptors(ClassSerializerInterceptor)
  // async infiniteList(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  // ): Promise<Instructor[]> {
  //   return await this.schoolInstructorService.list(schoolId);
  // }
}
