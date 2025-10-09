import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { UpdateSurveyDto } from '../dto/update-survey.dto';
import { Survey } from '../entities/survey.entity';

//? ---------------------------------------------------------------------- ?//
//? Survey Controller - CREATE
//? ---------------------------------------------------------------------- ?//

export const CreateSurveyDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📝 설문조사 생성',
      description: '학기에 귀속된 설문조사를 생성합니다 (질문 및 선택지 포함).',
    }),
    ApiBody({ type: CreateSurveyDto }),
    ApiCreatedResponseTemplate({
      description: '설문조사 생성 완료',
      type: Survey,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Survey Controller - READ
//? ---------------------------------------------------------------------- ?//

export const FindSurveyByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 설문조사 상세 조회',
      description:
        '설문조사의 상세 정보를 조회합니다 (질문, 선택지, 응답 포함).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 설문조사의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '설문조사 상세 조회 완료',
      type: Survey,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Survey Controller - UPDATE
//? ---------------------------------------------------------------------- ?//

export const UpdateSurveyDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 설문조사 수정',
      description:
        '설문조사 정보를 부분적으로 수정합니다 (제공된 필드만 업데이트).',
    }),
    ApiParam({
      name: 'surveyId',
      type: Number,
      description: '수정할 설문조사의 ID',
      example: 1,
    }),
    ApiBody({ type: UpdateSurveyDto }),
    ApiOkResponseTemplate({
      description: '설문조사 수정 완료',
      type: Survey,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Survey Controller - DELETE
//? ---------------------------------------------------------------------- ?//

export const DeleteSurveyDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 설문조사 삭제',
      description:
        '설문조사를 소프트 삭제합니다 (Notifiable과 Recipient도 함께 삭제).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 설문조사의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '설문조사 삭제 완료',
      type: Survey,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

export const MarkAsReadDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 설문조사 읽음 표시',
      description:
        '학부모가 설문조사를 읽었음을 표시합니다 (해당 학부모의 모든 자녀에 대해 readAt 업데이트).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '읽음 표시할 설문조사의 ID',
      example: 1,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '읽음 표시할 학부모의 ID',
      example: 5,
    }),
    ApiOkResponseTemplate({
      description: '읽음 표시 완료 (응답 본문 없음)',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
