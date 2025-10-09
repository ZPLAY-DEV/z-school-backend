import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Survey } from 'src/domain/survey/entities/survey.entity';

const SCHOOL_SURVEY_CONFIG: PaginateConfig<Survey> = {
  sortableColumns: ['id', 'createdAt', 'start', 'end'],
  searchableColumns: ['title', 'intro', 'outro'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {},
};

//? ---------------------------------------------------------------------- ?//
//? List School Term Surveys
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermSurveysDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 설문조사 목록 조회',
      description:
        '특정 학교의 설문조사 목록을 조회합니다. termId로 특정 학기만 필터링 가능합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항)',
      required: false,
      example: 1,
    }),
    ApiExtraModels(Survey),
    ApiOkResponse({
      description: '설문조사 목록 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Survey) },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Infinite List School Term Surveys
//? ---------------------------------------------------------------------- ?//

export const InfiniteListSchoolTermSurveysDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 설문조사 페이지네이션 조회',
      description:
        '특정 학교의 설문조사를 페이지네이션으로 조회합니다. termId로 특정 학기만 필터링하고, title, intro, outro에서 검색 가능합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항)',
      required: false,
      example: 1,
    }),
    ApiPaginationQuery(SCHOOL_SURVEY_CONFIG),
    ApiOkPaginatedResponse(Survey, SCHOOL_SURVEY_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

