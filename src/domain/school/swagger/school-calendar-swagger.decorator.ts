import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';

//? ---------------------------------------------------------------------- ?//
//? Create All School Calendars
//? ---------------------------------------------------------------------- ?//
export const CreateAllSchoolCalendarsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 모든 학교 캘린더 일괄 생성 (NEIS API 연동)',
      description:
        '모든 학교의 학사일정을 NEIS API를 통해 일괄 생성/동기화합니다.',
    }),
    ApiCreatedResponse({
      description: '모든 학교 캘린더 생성 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 총 캘린더 항목 수',
        example: 1250,
      },
    }),
    ApiStatuses(StatusCodes.INTERNAL_SERVER_ERROR),
  );

//? ---------------------------------------------------------------------- ?//
//? Create School Calendar
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolCalendarDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학교 캘린더 생성 (NEIS API 연동)',
      description:
        '지정된 학교의 학사일정을 NEIS API를 통해 생성/동기화합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiCreatedResponse({
      description: '학교 캘린더 생성 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 캘린더 항목 수',
        example: 42,
      },
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );

//? ---------------------------------------------------------------------- ?//
//? List School Calendars
//? ---------------------------------------------------------------------- ?//
export const ListSchoolCalendarsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학교 캘린더 목록 조회',
      description: '학교의 모든 학사일정 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '학교 캘린더 목록 조회 완료',
      type: Calendar,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Paginated School Calendars
//? ---------------------------------------------------------------------- ?//
export const PaginatedSchoolCalendarsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학교 캘린더 페이지네이션 목록',
      description:
        '학교의 학사일정 목록을 페이지네이션으로 조회합니다 (검색, 정렬 지원).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponse({
      description: '페이지네이션된 학교 캘린더 목록 조회 완료',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
