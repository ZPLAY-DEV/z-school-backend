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
import { SchoolTermComboResponseDto } from 'src/domain/school/dto/school-term-combo-response.dto';
import { SchoolTermComboService } from 'src/domain/school/school-term-combo.service';

@ApiTags('✅ Schools > Terms > Lessons-Sams-Students ( 학교 > 학기 > LSS콤보 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermComboController {
  constructor(
    private readonly schoolTermComboService: SchoolTermComboService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Get(':schoolId/terms/:termId/combo')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<SchoolTermComboResponseDto> {
    return await this.schoolTermComboService.list(schoolId, termId);
  }
}
