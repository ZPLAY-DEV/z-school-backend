import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { SchoolTermSurveyService } from 'src/domain/school/school-term-survey.service';
import {
  InfiniteListSchoolTermSurveysDocs,
  ListSchoolTermSurveysDocs,
} from 'src/domain/school/swagger/school-survey-swagger.decorator';
import { Survey } from 'src/domain/survey/entities/survey.entity';

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

  @ListSchoolTermSurveysDocs()
  @Get(':schoolId/surveys')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('termId') termId?: number,
  ): Promise<Survey[]> {
    return await this.schoolTermSurveyService.list(schoolId, termId);
  }

  @InfiniteListSchoolTermSurveysDocs()
  @Get(':schoolId/surveys/paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async infiniteList(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Paginate() query: PaginateQuery,
    @Query('termId') termId: number,
  ) {
    return await this.schoolTermSurveyService.infiniteList(
      schoolId,
      query,
      termId,
    );
  }
}
