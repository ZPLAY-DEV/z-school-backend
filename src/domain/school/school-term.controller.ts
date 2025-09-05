import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SchoolTermService } from 'src/domain/school/school-term.service';
import { ListSchoolTermDocs } from 'src/domain/school/swagger/school-term-swagger.decorator';
import { Term } from 'src/domain/term/entities/term.entity';

@ApiTags('✳️ Schools > Terms ( 학교 > 학기 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermController {
  constructor(private readonly schoolTermService: SchoolTermService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSchoolTermDocs()
  @Get(':schoolId/terms')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Term[]> {
    return await this.schoolTermService.list(schoolId);
  }

  @ListSchoolTermDocs()
  @Get(':schoolId/previous-terms/:termId')
  async listPrevious(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Term[]> {
    return await this.schoolTermService.listPrevious(schoolId, termId);
  }
}
