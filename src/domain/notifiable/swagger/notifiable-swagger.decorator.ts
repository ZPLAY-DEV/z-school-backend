import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { NotifiableStatusItemDto } from '../dto/notifiable-status-item.dto';
import { SendNotifiableDto } from '../dto/send-notifiable.dto';
import { Notifiable } from '../entities/notifiable.entity';

//? ---------------------------------------------------------------------- ?//
//? Notifiable Controller - CREATE / SEND
//? ---------------------------------------------------------------------- ?//

export const SendNotifiableDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📤 Notifiable 발송',
      description:
        'Notifiable을 발송 대상(SCHOOL/GRADE/LESSON/GROUP/STUDENT)에 따라 발송하거나 예약합니다.',
    }),
    ApiBody({
      type: SendNotifiableDto,
      examples: {
        'school-wide-dispatch': {
          summary: '전교생 발송',
          description: '전교생 대상 Notifiable 발송',
          value: {
            notifiableId: 1,
            target: 'SCHOOL',
            targetLabel: '전교생',
            scheduledAt: null,
            status: 'INIT',
          },
        },
        'grade-specific-dispatch': {
          summary: '특정 학년 발송',
          description: '1, 2학년 대상 Notifiable 발송',
          value: {
            notifiableId: 2,
            target: 'GRADE',
            targetItems: [1, 2],
            targetLabel: '1, 2학년',
            scheduledAt: '2025-03-10T09:00:00Z',
            status: 'SCHEDULED',
          },
        },
        'lesson-specific-dispatch': {
          summary: '특정 과목 발송',
          description: '미술반 수강생 대상 발송',
          value: {
            notifiableId: 3,
            target: 'LESSON',
            targetItems: [10, 11],
            targetLabel: '미술반 A, B조',
            scheduledAt: null,
            status: 'INIT',
          },
        },
        'individual-dispatch': {
          summary: '개별 학생 발송',
          description: '특정 학생들 대상 발송',
          value: {
            notifiableId: 4,
            target: 'STUDENT',
            targetItems: [123, 124, 125],
            targetLabel: '특별활동 선발 학생',
            scheduledAt: '2025-05-01T10:00:00Z',
            status: 'SCHEDULED',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: 'Notifiable 발송 완료',
      type: Notifiable,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Notifiable Controller - UPDATE
//? ---------------------------------------------------------------------- ?//

export const ResendNotifiableDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 Notifiable 재발송',
      description:
        '읽지 않은 수신자들에게만 선별적으로 재발송합니다 (SENT 상태만 가능).',
    }),
    ApiOkResponse({
      description: 'Notifiable 재발송 완료 (응답 본문 없음)',
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Notifiable Controller - READ
//? ---------------------------------------------------------------------- ?//

export const GetNotifiableStatusItemsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 Notifiable 수신자 상태 목록 조회',
      description:
        'Notifiable의 모든 수신자 상태를 조회합니다 (학생 정보, readAt, answeredAt, 링크 포함).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수신자 상태를 조회할 Notifiable의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: 'Notifiable 수신자 상태 목록 조회 완료',
      type: NotifiableStatusItemDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

export const GetNotifiableStatusItemsPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 Notifiable 수신자 상태 목록 조회 (페이지네이션)',
      description:
        '수신자 상태를 페이지네이션으로 조회합니다 (검색: 학생 이름, 필터: 학년/반).',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수신자 상태를 조회할 Notifiable의 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'page',
      type: Number,
      description: '페이지 번호 (1부터 시작)',
      example: 1,
      required: false,
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      description: '페이지당 항목 수 (기본값: 20, 최대: 100)',
      example: 20,
      required: false,
    }),
    ApiQuery({
      name: 'search',
      type: String,
      description: '학생 이름으로 검색 (부분 일치)',
      example: '김철수',
      required: false,
    }),
    ApiQuery({
      name: 'filter.student.grade',
      type: String,
      description: '학년 필터 (예: 3 또는 $in:1,2,3)',
      example: '3',
      required: false,
    }),
    ApiQuery({
      name: 'filter.student.class',
      type: String,
      description: '반 필터 (예: 1 또는 $in:1,2)',
      example: '1',
      required: false,
    }),
    ApiQuery({
      name: 'sortBy',
      type: String,
      description: '정렬 기준 컬럼',
      example: 'student.name:ASC',
      required: false,
    }),
    ApiOkResponse({
      description: 'Notifiable 수신자 상태 목록 조회 완료 (페이지네이션)',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/NotifiableStatusItemDto',
            },
          },
          meta: {
            type: 'object',
            properties: {
              itemsPerPage: { type: 'number', example: 20 },
              totalItems: { type: 'number', example: 150 },
              currentPage: { type: 'number', example: 1 },
              totalPages: { type: 'number', example: 8 },
            },
          },
          links: {
            type: 'object',
            properties: {
              first: { type: 'string' },
              previous: { type: 'string' },
              current: { type: 'string' },
              next: { type: 'string' },
              last: { type: 'string' },
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

export const FindPendingDispatchesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏳ 발송 대기 중인 Notifiable 조회',
      description:
        '발송 예약 시간이 지났지만 아직 발송되지 않은 Notifiable들을 조회합니다 (status: SCHEDULED).',
    }),
    ApiOkResponse({
      description: '발송 대기 중인 Notifiable 목록 조회 완료',
      type: Notifiable,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
