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
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';

@ApiTags('✅ Schools > Terms > Sams ( 학교 > 학기 > 학교쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSamController {
  constructor(private readonly schoolTermSamService: SchoolTermSamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Get(':schoolId/terms/:termId/sams')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Sam[]> {
    return await this.schoolTermSamService.list(schoolId, termId);
  }
}
