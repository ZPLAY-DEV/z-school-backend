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
import { AttendanceKeyDto } from 'src/domain/attendance/dto/upsert-attendance.dto';

//? ---------------------------------------------------------------------- ?//
//? Fetch Attendances (with pagination)
//? ---------------------------------------------------------------------- ?//

export const FetchAttendancesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 목록 (사용 안함)',
      description: `
      ## 📋 출석 목록 조회 (커서 기반 페이지네이션)
      
      ### 🎯 기능
      - 특정 그룹의 출석 목록을 페이지네이션으로 조회
      - 커서 기반 페이지네이션 (무한스크롤 지원)
      - 최신 순으로 정렬 (dailyStudentKey 내림차순)
      - 한 번에 최대 10개 아이템 반환
      
      ### 📝 파라미터
      - **groupId**: 그룹 ID (숫자, 필수)
      - **cursor**: 다음 페이지를 위한 커서 토큰 (선택적, base64 인코딩)
      
      ### 📤 응답
      - **items**: 출석 기록 배열 (최대 10개)
      - **count**: 현재 페이지 실제 아이템 수
      - **nextCursor**: 다음 페이지 커서 (마지막 페이지면 null)
      - **hasMore**: 다음 페이지 존재 여부 (boolean)
      
      ### 🔄 페이지네이션 사용법
      1. 첫 요청: \`cursor\` 없이 호출
      2. 다음 페이지: 응답의 \`nextCursor\`를 \`cursor\`로 사용
      3. 마지막 페이지: \`hasMore\`가 \`false\`가 될 때까지 반복
      `,
    }),
    ApiQuery({
      name: 'groupId',
      type: Number,
      description: '🈵 그룹 ID (조회할 그룹의 고유 식별자)',
      example: 123,
      required: true,
    }),
    ApiQuery({
      name: 'cursor',
      type: String,
      required: false,
      description: `🈳 페이지네이션 커서 토큰 (base64 인코딩)
      
      - 첫 페이지: 생략
      - 다음 페이지: 이전 응답의 nextCursor 값 사용
      - 형식: base64로 인코딩된 JSON 객체`,
      example:
        'eyJncm91cEtleSI6IkdST1VQIzEyMyIsImRhaWx5U3R1ZGVudEtleSI6IkRBVEUjMjAyNS0wMS0xNSNTVFVERU5UIzc4OSMxLUEtMDEifQ==',
    }),
    ApiOkResponse({
      description: '✅ 출석 목록 조회 완료',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: '출석 기록 목록 (최대 10개)',
            items: {
              type: 'object',
              properties: {
                groupKey: {
                  type: 'string',
                  example: 'GROUP#123',
                  description: '그룹 키',
                },
                dailyStudentKey: {
                  type: 'string',
                  example: 'DATE#2025-01-15#STUDENT#789#1-A-01',
                  description: '일일 학생 키',
                },
                lessonId: {
                  type: 'number',
                  example: 456,
                  description: '수업 ID',
                },
                lessonName: {
                  type: 'string',
                  example: '초급 수학',
                  description: '수업명',
                },
                groupId: {
                  type: 'number',
                  example: 123,
                  description: '그룹 ID',
                },
                groupName: {
                  type: 'string',
                  example: '1학년 A반 수학',
                  description: '그룹명',
                },
                studentId: {
                  type: 'number',
                  example: 789,
                  description: '학생 ID',
                },
                studentName: {
                  type: 'string',
                  example: '김민수',
                  description: '학생명',
                },
                start: {
                  type: 'string',
                  example: '14:00',
                  description: '수업 시작 시간',
                },
                end: {
                  type: 'string',
                  example: '14:40',
                  description: '수업 종료 시간',
                },
                duration: {
                  type: 'number',
                  example: 40,
                  description: '수업 시간 (분)',
                },
                status: {
                  type: 'string',
                  enum: [
                    'PENDING',
                    'PRESENT',
                    'ABSENT',
                    'LATE',
                    'EXCUSED_ABSENT',
                  ],
                  example: 'PRESENT',
                  description: '출석 상태',
                },
                parentNote: {
                  type: 'string',
                  nullable: true,
                  example: '정상 출석합니다.',
                  description: '학부모 메모',
                },
                schoolNote: {
                  type: 'string',
                  nullable: true,
                  example: '수업 태도가 좋습니다.',
                  description: '강사 메모',
                },
                isRead: {
                  type: 'boolean',
                  nullable: true,
                  example: false,
                  description: '읽음 여부',
                },
                expires: {
                  type: 'number',
                  example: 1736956800,
                  description: 'TTL - Unix timestamp',
                },
                createdAt: {
                  type: 'number',
                  nullable: true,
                  example: 1704067200000,
                  description: '생성 시간 (timestamp)',
                },
                updatedAt: {
                  type: 'number',
                  nullable: true,
                  example: 1704067260000,
                  description: '수정 시간 (timestamp)',
                },
              },
            },
          },
          count: {
            type: 'number',
            description: '현재 페이지 실제 아이템 수',
            example: 10,
            minimum: 0,
            maximum: 10,
          },
          nextCursor: {
            type: 'string',
            description: '다음 페이지 커서 (마지막 페이지면 null)',
            nullable: true,
            example:
              'eyJncm91cEtleSI6IkdST1VQIzEyMyIsImRhaWx5U3R1ZGVudEtleSI6IkRBVEUjMjAyNS0wMS0xNCNTVFVERU5UIzc4OCMxLUEtMDIifQ==',
          },
          hasMore: {
            type: 'boolean',
            description: '다음 페이지 존재 여부',
            example: true,
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
      ## 🔍 출석 기록 상세 조회
      
      ### 🎯 기능
      - 특정 출석 기록의 상세 정보 조회
      - groupId, date, studentId 조합으로 고유 식별
      - 시스템이 자동으로 groupKey, dailyStudentKey 생성
      
      ### 📝 파라미터
      - **groupId**: 그룹 ID (숫자, 필수)
      - **date**: 날짜 (YYYY-MM-DD 형식, 필수)
      - **studentId**: 학생 ID (숫자, 필수)
      
      ### 🔍 조회 로직
      1. groupId → groupKey 변환 (GROUP#{groupId})
      2. date + studentId → dailyStudentKey 추정
      3. DynamoDB에서 정확한 키로 조회
      `,
    }),
    ApiQuery({
      name: 'groupId',
      type: Number,
      description: '🈵 그룹 ID (조회할 그룹의 고유 식별자)',
      example: 123,
      required: true,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '🈵 출석 날짜 (YYYY-MM-DD 형식)',
      example: '2025-01-15',
      required: true,
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    }),
    ApiQuery({
      name: 'studentId',
      type: Number,
      description: '🈵 학생 ID (조회할 학생의 고유 식별자)',
      example: 789,
      required: true,
    }),
    ApiOkResponse({
      description: '✅ 출석 상세 조회 완료',
      schema: {
        type: 'object',
        properties: {
          groupKey: {
            type: 'string',
            example: 'GROUP#123',
            description: '그룹 키',
          },
          dailyStudentKey: {
            type: 'string',
            example: 'DATE#2025-01-15#STUDENT#789#1-A-01',
            description: '일일 학생 키',
          },
          lessonId: {
            type: 'number',
            example: 456,
            description: '수업 ID',
          },
          lessonName: {
            type: 'string',
            example: '초급 수학',
            description: '수업명',
          },
          groupId: {
            type: 'number',
            example: 123,
            description: '그룹 ID',
          },
          groupName: {
            type: 'string',
            example: '1학년 A반 수학',
            description: '그룹명',
          },
          studentId: {
            type: 'number',
            example: 789,
            description: '학생 ID',
          },
          studentName: {
            type: 'string',
            example: '김민수',
            description: '학생명',
          },
          start: {
            type: 'string',
            example: '14:00',
            description: '수업 시작 시간',
          },
          end: {
            type: 'string',
            example: '14:40',
            description: '수업 종료 시간',
          },
          duration: {
            type: 'number',
            example: 40,
            description: '수업 시간 (분)',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED_ABSENT'],
            example: 'PRESENT',
            description: '출석 상태',
          },
          parentNote: {
            type: 'string',
            nullable: true,
            example: '정상 출석합니다.',
            description: '학부모 메모',
          },
          schoolNote: {
            type: 'string',
            nullable: true,
            example: '수업 태도가 좋습니다.',
            description: '강사 메모',
          },
          isRead: {
            type: 'boolean',
            nullable: true,
            example: false,
            description: '읽음 여부',
          },
          expires: {
            type: 'number',
            example: 1736956800,
            description: 'TTL - Unix timestamp (DynamoDB 자동 삭제 시간)',
          },
          createdAt: {
            type: 'number',
            nullable: true,
            example: 1704067200000,
            description: '생성 시간 (timestamp)',
          },
          updatedAt: {
            type: 'number',
            nullable: true,
            example: 1704067260000,
            description: '수정 시간 (timestamp)',
          },
        },
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.DYNAMO_READ,
          HttpErrorConstants.INVALID_QUERY_PARAMS,
        ],
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
      summary: '출석 (사용 안함)',
      description: `
      ## 🗑️ 출석 기록 삭제
      
      ### 🎯 기능
      - 출석 기록 완전 삭제 (물리적 삭제)
      - groupKey, dailyStudentKey로 삭제 대상 식별
      - DynamoDB에서 즉시 제거
      
      ### 📋 입력 데이터
      - **groupKey**: 그룹 키 (필수, 형식: GROUP#숫자)
      - **dailyStudentKey**: 일일 학생 키 (필수, 정확한 형식 필요)
      
      ### ⚠️ 주의사항
      - **삭제된 데이터는 복구할 수 없습니다**
      - 정확한 키 값을 입력해주세요
      - 존재하지 않는 키로 삭제 시도시 에러 발생
      `,
    }),
    ApiBody({
      type: AttendanceKeyDto,
      description: '삭제할 출석 기록의 키 정보',
      examples: {
        example1: {
          summary: '출석 기록 삭제',
          description: '특정 날짜의 특정 학생 출석 기록 삭제',
          value: {
            groupKey: 'GROUP#123',
            dailyStudentKey: 'DATE#2025-01-15#STUDENT#789#1-A-01',
          },
        },
        example2: {
          summary: '다른 날짜 기록 삭제',
          description: '다른 날짜의 출석 기록 삭제 예시',
          value: {
            groupKey: 'GROUP#123',
            dailyStudentKey: 'DATE#2025-01-14#STUDENT#788#1-A-02',
          },
        },
      },
    }),
    ApiOkResponse({
      description: '✅ 출석 기록 삭제 완료',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '출석 기록이 성공적으로 삭제되었습니다.',
            description: '삭제 완료 메시지',
          },
          deletedKey: {
            type: 'object',
            description: '삭제된 키 정보 (확인용)',
            properties: {
              groupKey: {
                type: 'string',
                example: 'GROUP#123',
              },
              dailyStudentKey: {
                type: 'string',
                example: 'DATE#2025-01-15#STUDENT#789#1-A-01',
              },
            },
          },
        },
      },
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
