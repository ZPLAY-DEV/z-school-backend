import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateSurveyDto } from 'src/domain/survey/dto/create-survey.dto';
import { UpdateSurveyDto } from 'src/domain/survey/dto/update-survey.dto';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { SurveyService } from 'src/domain/survey/survey.service';
import {
  CreateSurveyDocs,
  DeleteSurveyDocs,
  FindSurveyByIdDocs,
  MarkAsReadByParentDocs,
  MarkAsReadByStudentDocs,
  UpdateSurveyDocs,
} from 'src/domain/survey/swagger/survey-swagger.decorator';

@ApiTags('✳️ Surveys ( 설문조사 )')
@Controller('surveys')
@UseInterceptors(ClassSerializerInterceptor)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @CreateSurveyDocs()
  @Post()
  async create(@Body() dto: CreateSurveyDto): Promise<Survey> {
    return await this.surveyService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @FindSurveyByIdDocs()
  @Get(':id')
  async findDetailById(@Param('id', ParseIntPipe) id: number): Promise<Survey> {
    return await this.surveyService.findById(id, [
      'school',
      'term',
      'surveyQuestions',
      'surveyAnswers',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @UpdateSurveyDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyDto,
  ): Promise<Survey> {
    return await this.surveyService.update(id, dto);
  }

  @MarkAsReadByParentDocs()
  @Public()
  @Patch(':id/parents/:parentId/read')
  async markAsReadByParent(
    @Param('id', ParseIntPipe) surveyId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<void> {
    return await this.surveyService.markAsReadByParent(surveyId, parentId);
  }

  @MarkAsReadByStudentDocs()
  @Public()
  @Patch(':id/students/:studentId/read')
  async markAsReadByStudent(
    @Param('id', ParseIntPipe) surveyId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<void> {
    return await this.surveyService.markAsReadByStudent(surveyId, studentId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @DeleteSurveyDocs()
  @Delete(':id')
  async deleteSurvey(@Param('id', ParseIntPipe) id: number): Promise<Survey> {
    return await this.surveyService.delete(id);
  }
}
