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
import { ResponseSchoolTermComboDto } from 'src/domain/school/dto/response-school-term-combo.dto';
import { SchoolTermComboService } from 'src/domain/school/school-term-combo.service';
import { GetSchoolTermComboDocs } from './swagger/school-term-combo-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Combo ( 학교 > 학기 > 콤보 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermComboController {
  constructor(
    private readonly schoolTermComboService: SchoolTermComboService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetSchoolTermComboDocs()
  @Public()
  @Get(':schoolId/terms/:termId/combo')
  @UseInterceptors(ClassSerializerInterceptor)
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<ResponseSchoolTermComboDto> {
    return await this.schoolTermComboService.list(schoolId, termId);
  }
}
