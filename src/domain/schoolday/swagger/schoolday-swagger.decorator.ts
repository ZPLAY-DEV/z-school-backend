import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { UpdateSchooldayTimeDto } from '../dto/update-schoolday.dto';
import { Schoolday } from '../entities/schoolday.entity';

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday List
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수업일 👈 리스트 조회',
      description: `
      - 수업일 전체 리스트 조회
      - 사용될까 의문스럽지만 일단 지원함.
      `,
    }),
    ApiOkResponse({
      description: '수업일 리스트 조회 완료',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Schoolday) },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_SERVER_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday Paginated List
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수업일 👈 페이지네이션 리스트 조회',
      description: `
      - 수업일 페이지네이션 리스트 조회
      - nestjs-paginate 라이브러리 사용
      - 정렬 가능 필드: id, name
      - 검색 가능 필드: name
      - 필터 가능 필드: schoolId, termId, lessonId, groupId, startsAt, endsAt
      - 기본 정렬: id DESC
      `,
    }),
    ApiOkPaginatedResponse(Schoolday, {
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        termId: [FilterOperator.EQ],
        lessonId: [FilterOperator.EQ],
        groupId: [FilterOperator.EQ, FilterOperator.IN],
        startsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        endsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['id', 'name'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        schoolId: [FilterOperator.EQ],
        termId: [FilterOperator.EQ],
        lessonId: [FilterOperator.EQ],
        groupId: [FilterOperator.EQ, FilterOperator.IN],
        startsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        endsAt: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Schoolday by ID
//? ---------------------------------------------------------------------- ?//

export const GetSchooldayByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수업일 👈 상세 조회',
      description: `
      - 수업일 ID로 상세 정보 조회
      - 그룹, 그룹 학생, 학생, 수업 정보 포함
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수업일 ID',
    }),
    ApiOkResponseTemplate({
      description: '수업일 상세 조회 완료',
      type: Schoolday,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Schoolday Time
//? ---------------------------------------------------------------------- ?//

export const UpdateSchooldayTimeDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수업일 👈 시간 수정',
      description: `
      - 수업일의 시작/종료 시간 수정
      - DynamoDB 출석부도 함께 수정됨
      - 기존 시간과 동일한 시간으로 수정 시도시 에러 발생
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수업일 ID',
    }),
    ApiBody({
      type: UpdateSchooldayTimeDto,
      examples: {
        example1: {
          summary: '시간 수정 예시',
          value: {
            startsAt: '2024-01-15T09:00:00.000Z',
            endsAt: '2024-01-15T10:00:00.000Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '수업일 시간 수정 완료',
      type: Schoolday,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
