import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SchoolTermSurveyService } from 'src/domain/school/school-term-survey.service';

@ApiTags('✳️ Schools > Terms > Surveys ( 학교 > 학기 > 설문조사 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSurveyController {
  constructor(
    private readonly schoolTermSurveyService: SchoolTermSurveyService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: '학교별 설문조사 목록 조회' })
  @Get(':schoolId/surveys')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
  ): Promise<Survey[]> {
    return await this.schoolTermSurveyService.list(schoolId, termId);
  }

  @ApiOperation({ description: '학교별 설문조사 페이지네이션 목록 조회' })
  @Get(':schoolId/surveys/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
    @Query('termId') termId?: number,
  ) {
    return await this.schoolTermSurveyService.infiniteList(
      schoolId,
      query,
      termId,
    );
  }
}
