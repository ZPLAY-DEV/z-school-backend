import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';

//? ---------------------------------------------------------------------- ?//
//? Find Attendance By Date
//? ---------------------------------------------------------------------- ?//

export const FindAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '특정 과목의 특정 날짜 출석 리스트 조회',
      description: `
      - 특정 과목(lesson)의 특정 날짜에 해당하는 모든 출석 정보를 조회합니다.
      - 해당 날짜에 수업이 있었던 모든 학생들의 출석 상태를 반환합니다.
      `,
    }),
    ApiParam({
      name: 'lessonId',
      type: Number,
      description: '과목 ID',
      example: 1,
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식)',
      example: '2024-12-30',
    }),
    ApiOkResponse({
      description: '특정 날짜의 출석 리스트 조회 완료',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: 'DynamoDB partition key',
              example: 'GROUP#1',
            },
            dailyStudentKey: {
              type: 'string',
              description: 'DynamoDB sort key',
              example: 'DATE#2024-12-30#STUDENT#1',
            },
            lessonId: {
              type: 'number',
              description: '과목 ID',
              example: 1,
            },
            lessonName: {
              type: 'string',
              description: '과목명',
              example: '수학',
            },
            groupId: {
              type: 'number',
              description: '그룹 ID',
              example: 1,
            },
            groupName: {
              type: 'string',
              description: '그룹명',
              example: '1학년 1반',
            },
            studentId: {
              type: 'string',
              description: '학생 ID',
              example: '1학년1반-10',
            },
            studentName: {
              type: 'string',
              description: '학생명',
              example: '홍길동',
            },
            start: {
              type: 'string',
              description: '수업 시작 시간',
              example: '14:00',
            },
            end: {
              type: 'string',
              description: '수업 종료 시간',
              example: '14:40',
            },
            duration: {
              type: 'number',
              description: '수업 시간 (분)',
              example: 40,
            },
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
              description: '출석 상태',
              example: 'PRESENT',
            },
            parentNote: {
              type: 'string',
              description: '학부모 메모',
              nullable: true,
              example: '치과 치료로 인한 결석',
            },
            schoolNote: {
              type: 'string',
              description: '학교 메모',
              nullable: true,
              example: '공결 처리',
            },
            createdAt: {
              type: 'number',
              description: '생성 시간 (Unix timestamp)',
              nullable: true,
              example: 1703905200,
            },
            updatedAt: {
              type: 'number',
              description: '수정 시간 (Unix timestamp)',
              nullable: true,
              example: 1703905200,
            },
            isRead: {
              type: 'boolean',
              description: '읽음 여부',
              nullable: true,
              example: true,
            },
          },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_LESSON],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Attendance Report
//? ---------------------------------------------------------------------- ?//

export const GetReportDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '특정 과목의 특정 날짜 출석 리포트 조회',
      description: `
      - 특정 과목(lesson)의 특정 날짜에 해당하는 출석 리포트를 조회합니다.
      - 학생별로 출석 정보를 그룹화하여 리포트 형태로 반환합니다.
      - 각 학생의 출석 기록이 날짜순으로 정렬되어 제공됩니다.
      
      ### 사용 예시:
      - 특정 수업의 출석 현황을 한눈에 파악
      - 학생별 출석 패턴 분석
      - 출석 통계 생성을 위한 데이터 수집
      `,
    }),
    ApiParam({
      name: 'lessonId',
      type: Number,
      description: '과목 ID',
      example: 1,
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식)',
      example: '2024-12-30',
    }),
    ApiOkResponse({
      description: '특정 날짜의 출석 리포트 조회 완료',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentKey: {
              type: 'string',
              description: '학생 고유 키',
              example: '1학년1반-10',
            },
            studentName: {
              type: 'string',
              description: '학생명',
              example: '홍길동',
            },
            attendances: {
              type: 'array',
              description: '출석 기록 배열',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: '출석 날짜',
                    example: '2024-12-30',
                  },
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
                    description: '출석 상태',
                    example: 'PRESENT',
                  },
                },
              },
            },
          },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_LESSON],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};
