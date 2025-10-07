import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSurveyDto } from 'src/domain/survey/dto/create-survey.dto';
import { UpdateSurveyDto } from 'src/domain/survey/dto/update-survey.dto';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SurveyService } from 'src/domain/survey/survey.service';

@ApiTags('⚠️ Surveys ( 설문조사 )')
@Controller('surveys')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Survey 생성' })
  @Post()
  async create(@Body() dto: CreateSurveyDto): Promise<Survey> {
    return await this.surveyService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Survey 상세 조회' })
  @Get(':id')
  async getSurveyById(@Param('id', ParseIntPipe) id: number): Promise<Survey> {
    return await this.surveyService.findById(id, [
      'school',
      'term',
      'surveyTargets',
      'surveyQuestions',
      'surveyAnswers',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Survey 수정' })
  @Patch(':surveyId')
  async update(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: UpdateSurveyDto,
  ): Promise<Survey> {
    return await this.surveyService.update(surveyId, dto);
  }
}
