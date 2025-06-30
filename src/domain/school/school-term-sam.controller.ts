import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { SchoolTermSamListDocs } from 'src/domain/school/swagger/school-term-sam.swagger.decorator';

@ApiTags('✅ Schools > Terms > Sams ( 학교 > 학기 > 학교쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSamController {
  constructor(private readonly schoolTermSamService: SchoolTermSamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  // todo. do we even need this?
  // reasoning) 학교 학기 마다 강사를 관리하는 건 귀찮다고 했다 함.
  @SchoolTermSamListDocs()
  @Get(':schoolId/terms/:termId/sams')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Sam[]> {
    return await this.schoolTermSamService.list(schoolId, termId);
  }
}
