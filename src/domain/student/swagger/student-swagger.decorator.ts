//? ---------------------------------------------------------------------- ?//
//? 학생 생성
//? ---------------------------------------------------------------------- ?//

import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';

// Student 페이지네이션 설정
const STUDENT_CONFIG: PaginateConfig<Student> = {
  sortableColumns: ['id', 'name'],
  searchableColumns: ['name'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE],
  },
};

// Group 페이지네이션 설정
const GROUP_CONFIG: PaginateConfig<Group> = {
  sortableColumns: ['id'],
  defaultSortBy: [['id', 'DESC']],
};

export const CreateStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 생성',
      description: `
      - 학교에 속한 학생을 생성한다.
      `,
    }),
    ApiParam({ name: 'schoolId', type: Number, description: '학교 ID' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          parentId: {
            type: 'number',
            description: '🈳 학부모 ID',
            example: 1,
          },
          schoolId: {
            type: 'number',
            description: '🈵 School ID (number)',
            example: 1,
          },
          grade: {
            type: 'number',
            description: '🈵 학년 (up to 8 characters)',
            example: 1,
          },
          class: {
            type: 'string',
            description: '🈳 반 (up to 8 characters)',
            example: '1',
          },
          studentCode: {
            type: 'number',
            description: '🈳 학번/번호 ( number )',
            example: 1,
          },
          name: {
            type: 'string',
            description: '🈳 학생 이름 (up to 16 characters)',
            example: '홍길동',
          },
          phone: {
            type: 'string',
            description: '🈳 학생 전화번호 (up to 16 characters)',
            example: '01012345678',
          },
          escortPhone: {
            type: 'string',
            description: '🈳 귀가 동행인 전화번호 (up to 16 characters)',
            example: '01012345678',
          },
          homeTransit: {
            type: 'string',
            description: '🈳 하교 방법 (up to 32 characters)',
            example: '버스',
          },
          nextStop: {
            type: 'string',
            description: '🈳 하교후 가는 곳 (up to 32 characters)',
            example: '학원',
          },
          status: {
            type: 'string',
            description: '🈳 학생의 재학 상태 (enum default: ATTENDING)',
            example: 'ATTENDING',
          },
          note: {
            type: 'string',
            description: '🈳 비고 (up to 255 characters)',
            example: '관심과 주의가 필요한 학생',
          },
          parent: {
            type: 'object',
            description: '🈵 보호자 정보',
            properties: {
              userId: {
                type: 'number',
                description:
                  '🈳 User ID. seed 데이터 생성시 비워야 함. 가입시에만 필요',
                example: 1,
              },
              name: {
                type: 'string',
                description: '🈳 학부모 이름',
                example: '홍부모',
              },
              phone: {
                type: 'string',
                description: '🈵 전화번호 (숫자만)',
                example: '01088887777',
              },
              note: {
                type: 'string',
                description: '🈳 내용',
                example: '비고',
              },
              termsAgreedAt: {
                type: 'string',
                format: 'date-time',
                description: '🈳 약관동의 시각',
                example: '2025-01-01T12:00:00Z',
              },
            },
            required: ['phone'],
          },
        },
        required: ['schoolId', 'grade', 'parent'],
      },
    }),
    ApiCreatedResponseTemplate({
      description: '학교 학생 생성 완료',
      type: Student,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 생성 드라이런
//? ---------------------------------------------------------------------- ?//

export const CreateStudentDryRunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 생성 드라이런',
      description: '학생 생성 전 중복 체크',
    }),
    ApiBody({ type: CreateStudentDto }),
    ApiOkResponseTemplate({
      description: '중복되는 학생 정보',
      type: Student,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 단건 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 조회',
      description: '학생 ID로 학생 정보 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiOkResponseTemplate({
      description: '학생 조회 완료',
      type: Student,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 그룹 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 그룹 조회',
      description: '학생이 속한 그룹 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 그룹 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 취소된 그룹 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentCanceledGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 취소한 그룹 조회',
      description: '학생의 취소한 그룹 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '취소한 그룹 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 예약 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentBookingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 예약 조회',
      description: '학생의 예약 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 예약 조회 완료',
      type: Booking,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 정보 수정
//? ---------------------------------------------------------------------- ?//

export const UpdateStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 정보 수정',
      description: '학생 정보를 수정한다',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          parentId: {
            type: 'number',
            description: '🈳 학부모 ID',
            example: 1,
          },
          schoolId: {
            type: 'number',
            description: '🈵 School ID (number)',
            example: 1,
          },
          grade: {
            type: 'number',
            description: '🈵 학년 (up to 8 characters)',
            example: 1,
          },
          class: {
            type: 'string',
            description: '🈳 반 (up to 8 characters)',
            example: '1',
          },
          studentCode: {
            type: 'number',
            description: '🈳 학번/번호 ( number )',
            example: 1,
          },
          name: {
            type: 'string',
            description: '🈳 학생 이름 (up to 16 characters)',
            example: '홍길동',
          },
          phone: {
            type: 'string',
            description: '🈳 학생 전화번호 (up to 16 characters)',
            example: '01012345678',
          },
          escortPhone: {
            type: 'string',
            description: '🈳 귀가 동행인 전화번호 (up to 16 characters)',
            example: '01012345678',
          },
          homeTransit: {
            type: 'string',
            description: '🈳 하교 방법 (up to 32 characters)',
            example: '버스',
          },
          nextStop: {
            type: 'string',
            description: '🈳 하교후 가는 곳 (up to 32 characters)',
            example: '학원',
          },
          status: {
            type: 'string',
            description: '🈳 학생의 재학 상태 (enum default: ATTENDING)',
            example: 'ATTENDING',
          },
          note: {
            type: 'string',
            description: '🈳 비고 (up to 255 characters)',
            example: '관심과 주의가 필요한 학생',
          },
          parent: {
            type: 'object',
            description: '🈵 보호자 정보 (수정시 필수)',
            properties: {
              userId: {
                type: 'number',
                description:
                  '🈳 User ID. seed 데이터 생성시 비워야 함. 가입시에만 필요',
                example: 1,
              },
              name: {
                type: 'string',
                description: '🈳 학부모 이름',
                example: '홍부모',
              },
              phone: {
                type: 'string',
                description: '🈵 전화번호 (숫자만)',
                example: '01088887777',
              },
              note: {
                type: 'string',
                description: '🈳 내용',
                example: '비고',
              },
              termsAgreedAt: {
                type: 'string',
                format: 'date-time',
                description: '🈳 약관동의 시각',
                example: '2025-01-01T12:00:00Z',
              },
            },
          },
        },
        required: ['parent'],
      },
    }),
    ApiOkResponseTemplate({
      description: '학생 정보 수정 완료',
      type: Student,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 삭제
//? ---------------------------------------------------------------------- ?//

export const RemoveStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 삭제',
      description: '학생을 삭제한다',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiOkResponseTemplate({
      description: '학생 삭제 완료',
      type: Student,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 목록 페이지네이션 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 목록 페이지네이션 조회',
      description: '페이지네이션을 사용한 학생 목록 조회',
    }),
    ApiPaginationQuery(STUDENT_CONFIG),
    ApiOkPaginatedResponse(Student, STUDENT_CONFIG),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 등교일 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 등교일 조회',
      description: '학생의 등교일 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 등교일 조회 완료',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 그룹 페이지네이션 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 그룹 페이지네이션 조회',
      description: '페이지네이션을 사용한 학생 그룹 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? 학생 취소된 그룹 페이지네이션 조회
//? ---------------------------------------------------------------------- ?//

export const FindStudentCanceledGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생 취소된 그룹 페이지네이션 조회',
      description: '페이지네이션을 사용한 학생의 취소된 그룹 목록 조회',
    }),
    ApiParam({ name: 'id', type: Number, description: '학생 ID' }),
    ApiQuery({
      name: 'termId',
      type: Number,
      required: false,
      description: '학기 ID',
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
