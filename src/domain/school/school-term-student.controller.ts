import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SchoolTermStudentService } from 'src/domain/school/school-term-student.service';
import { Student } from 'src/domain/student/entities/student.entity';

@ApiTags('✅ Schools > Terms > Students ( 학교 > 학기 > 학생 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermStudentController {
  constructor(
    private readonly schoolTermStudentService: SchoolTermStudentService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Get(':schoolId/terms/:termId/students')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Student[]> {
    return await this.schoolTermStudentService.list(schoolId, termId);
  }
}
