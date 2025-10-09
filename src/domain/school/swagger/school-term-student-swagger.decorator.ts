import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { ResponseSchoolTermStudentBookingsDto } from '../dto/response-school-term-student-bookings.dto';
import {
  ResponseSchooldayItemDto,
  ResponseWeeklySchooldayDto,
} from '../dto/response-student-schoolday.dto';

// Group 페이지네이션 설정
const GROUP_CONFIG: PaginateConfig<Group> = {
  sortableColumns: ['id', 'groupName'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    groupName: [FilterOperator.ILIKE],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Get School Term Students List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학기별 등록 학생 목록 조회',
      description: '특정 학기에 등록된 모든 학생 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      example: 456,
    }),
    ApiOkResponseTemplate({
      description: '학기별 등록 학생 목록 조회 완료',
      type: Student,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Bookings
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentBookingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📋 학생 수강신청 목록 조회',
      description:
        '학생의 수강신청 목록을 요일별로 조회합니다 (Offering 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수강신청 목록 (요일별로 그룹화됨)',
      type: ResponseSchoolTermStudentBookingsDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Booking Stats
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentBookingStatsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📊 학생 수강신청 내용 (weekly)',
      description: '학생의 수강신청 내용을 요일별로 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '✅ 학생 수강신청 요일별 통계',
      schema: {
        type: 'object',
        properties: {
          MON: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '월요일 수강 Offering 목록',
          },
          TUE: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '화요일 수강 Offering 목록',
          },
          WED: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '수요일 수강 Offering 목록',
          },
          THU: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '목요일 수강 Offering 목록',
          },
          FRI: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '금요일 수강 Offering 목록',
          },
          SAT: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '토요일 수강 Offering 목록',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학생 수업일 조회 (all)',
      description: '학생의 모든 수업일을 조회합니다 (Group 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수업일 목록 (슬림 DTO)',
      type: ResponseSchooldayItemDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Groups
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회',
      description: '학생이 수강중인 모든 반 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 소속 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Groups Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회 (페이지네이션)',
      description:
        '학생이 수강중인 반 목록을 페이지네이션으로 조회합니다 (검색, 정렬 지원).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Canceled Groups
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentCanceledGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회',
      description: '학생이 수강 취소한 모든 반 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 취소 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Canceled Groups Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentCanceledGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회 (페이지네이션)',
      description:
        '학생이 수강 취소한 반 목록을 페이지네이션으로 조회합니다 (검색, 정렬 지원).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Weekly Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentWeeklySchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학생 주간 수업일 조회 (요일별)',
      description:
        '학생의 주간 수업일을 요일별로 조회합니다 (Group 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 123,
    }),
    ApiQuery({
      name: 'date',
      required: false,
      type: String,
      description:
        '기준 날짜 (yyyy-MM-dd 형식). null인 경우 오늘 날짜 기준으로 해당 주 계산',
      example: '2024-06-03',
      schema: {
        type: 'string',
        format: 'date',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 주간 수업일 요일별 목록 (슬림 DTO)',
      type: ResponseWeeklySchooldayDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
