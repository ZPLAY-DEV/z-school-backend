import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import {
  AttendanceKeyDto,
  UpsertAttendanceDto,
} from 'src/domain/attendance/dto/upsert-attendance.dto';

//? ---------------------------------------------------------------------- ?//
//? Create/Update Attendance
//? ---------------------------------------------------------------------- ?//

export const UpsertAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 👈 생성/수정 (Upsert)',
      description: `
      - 출석 기록 생성 또는 수정 (Upsert)
      - 존재하지 않으면 새로 생성, 존재하면 덮어쓰기
      - DynamoDB에 저장되며 groupKey(파티션키), dailyStudentKey(정렬키) 구조
      `,
    }),
    ApiBody({
      type: UpsertAttendanceDto,
    }),
    ApiOkResponse({
      description: '출석 기록 생성/수정 완료',
      schema: {
        type: 'object',
        properties: {
          groupKey: { type: 'string', example: 'GROUP#50' },
          dailyStudentKey: {
            type: 'string',
            example: 'DATE#2025-05-21#STUDENT#010110',
          },
          lessonId: { type: 'number', example: 123 },
          lessonName: { type: 'string', example: '수학' },
          groupId: { type: 'number', example: 50 },
          groupName: { type: 'string', example: '1학년 1반' },
          studentId: { type: 'string', example: '1학년1반-10' },
          studentName: { type: 'string', example: '김철수' },
          start: { type: 'string', example: '14:00' },
          end: { type: 'string', example: '14:40' },
          duration: { type: 'number', example: 40 },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'PRESENT',
              'ABSENT',
              'LATE',
              'REPORTED_ABSENT',
              'REPORTED_LATE',
            ],
          },
          parentNote: { type: 'string', nullable: true },
          schoolNote: { type: 'string', nullable: true },
          isRead: { type: 'boolean', nullable: true },
          createdAt: { type: 'number', nullable: true },
          updatedAt: { type: 'number', nullable: true },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.DYNAMO_WRITE,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Fetch Attendances (with pagination)
//? ---------------------------------------------------------------------- ?//

export const FetchAttendancesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 목록 👈 조회 (페이지네이션)',
      description: `
      - 특정 그룹의 출석 목록을 커서 기반 페이지네이션으로 조회
      - groupId: 그룹 ID (내부적으로 GROUP# prefix 추가)
      - cursor: 다음 페이지를 위한 커서 토큰 (base64 인코딩된 lastKey)
      - 응답에는 nextCursor와 hasMore 포함
      `,
    }),
    ApiQuery({
      name: 'groupId',
      type: String,
      description: '그룹 ID',
      example: '50',
    }),
    ApiQuery({
      name: 'cursor',
      type: String,
      required: false,
      description: '페이지네이션을 위한 커서 토큰',
      example: 'eyJncm91cEtleS...',
    }),
    ApiOkResponse({
      description: '출석 목록 조회 완료',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'object' },
            description: '출석 기록 목록',
          },
          count: {
            type: 'number',
            description: '현재 페이지 아이템 수',
          },
          nextCursor: {
            type: 'string',
            description: '다음 페이지 커서 (없으면 undefined)',
            nullable: true,
          },
          hasMore: {
            type: 'boolean',
            description: '다음 페이지 존재 여부',
          },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.INVALID_QUERY_PARAMS,
          HttpErrorConstants.DYNAMO_READ,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Attendance Detail
//? ---------------------------------------------------------------------- ?//

export const GetAttendanceDetailDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 👈 상세 조회',
      description: `
      - 특정 출석 기록의 상세 정보 조회
      - groupId, date, studentId를 조합하여 조회
      `,
    }),
    ApiQuery({
      name: 'groupId',
      type: String,
      description: '그룹 ID',
      example: '50',
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '날짜 (YYYY-MM-DD)',
      example: '2025-05-21',
    }),
    ApiQuery({
      name: 'studentId',
      type: String,
      description: '학생 ID',
      example: '1학년1반-10',
    }),
    ApiOkResponse({
      description: '출석 상세 조회 완료',
      schema: {
        type: 'object',
        properties: {
          groupKey: { type: 'string', example: 'GROUP#50' },
          dailyStudentKey: {
            type: 'string',
            example: 'DATE#2025-05-21#STUDENT#010110',
          },
          lessonId: { type: 'number', example: 123 },
          lessonName: { type: 'string', example: '수학' },
          groupId: { type: 'number', example: 50 },
          groupName: { type: 'string', example: '1학년 1반' },
          studentId: { type: 'string', example: '1학년1반-10' },
          studentName: { type: 'string', example: '김철수' },
          start: { type: 'string', example: '14:00' },
          end: { type: 'string', example: '14:40' },
          duration: { type: 'number', example: 40 },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'PRESENT',
              'ABSENT',
              'LATE',
              'REPORTED_ABSENT',
              'REPORTED_LATE',
            ],
          },
          parentNote: { type: 'string', nullable: true },
          schoolNote: { type: 'string', nullable: true },
          isRead: { type: 'boolean', nullable: true },
          createdAt: { type: 'number', nullable: true },
          updatedAt: { type: 'number', nullable: true },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.DYNAMO_READ],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Attendance
//? ---------------------------------------------------------------------- ?//

export const DeleteAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 👈 삭제',
      description: `
      - 출석 기록 삭제
      - groupKey, dailyStudentKey로 삭제 대상 식별
      - DynamoDB에서 완전 삭제 (물리적 삭제)
      `,
    }),
    ApiBody({
      type: AttendanceKeyDto,
      examples: {
        example1: {
          value: {
            groupKey: 'GROUP#50',
            dailyStudentKey: 'DATE#2025-05-21#STUDENT#010110',
          },
        },
      },
    }),
    ApiOkResponse({
      description: '출석 기록 삭제 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.DYNAMO_DELETE,
        ],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
