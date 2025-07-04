import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반별 출석 👈 특정 날짜 조회',
      description: `
      - 특정 반의 특정 날짜에 대한 출석 정보를 조회합니다.
      - DynamoDB에서 데이터를 조회하여 실시간 출석 상태를 반환합니다.
      
      ### 매개변수:
      - \`groupId\`: 조회할 반의 ID (숫자)
      - \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)
      
      ### 응답 데이터:
      - 해당 날짜의 모든 학생 출석 정보 배열
      - 각 출석 정보에는 학생 정보, 수업 정보, 출석 상태가 포함됩니다.
      
      ### 출석 상태:
      -  INIT = 'INIT', // 시작전
      -  PRESENT = 'PRESENT', // 출석
      -  ABSENT = 'ABSENT', // 결석
      -  LATE = 'LATE', // 지각
      -  LEFT = 'LEFT', // 조퇴
      -  EXCUSED_ABSENT = 'EXCUSED_ABSENT', // 선결석통보
      -  EXCUSED_LATE = 'EXCUSED_LATE', // 선지각통보
      -  EXCUSED_LEFT = 'EXCUSED_LEFT', // 선조퇴통보
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 정보 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: '반 키 (예: GROUP#123)',
              example: 'GROUP#123',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                '일별 학생 키 (예: DATE#2025-01-15#STUDENT#1학년1반-10)',
              example: 'DATE#2025-01-15#STUDENT#1학년1반-10',
            },
            lessonId: {
              type: 'number',
              description: '수업 ID',
              example: 456,
            },
            lessonName: {
              type: 'string',
              description: '수업명',
              example: '수학',
            },
            groupId: {
              type: 'number',
              description: '반 ID',
              example: 123,
            },
            groupName: {
              type: 'string',
              description: '반 이름',
              example: '1학년 1반',
            },
            studentId: {
              type: 'number',
              description: '학생 ID',
              example: 789,
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
                'INIT',
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              description: '출석 상태',
              example: 'PRESENT',
            },
            expires: {
              type: 'number',
              description: 'TTL (Time To Live)',
              example: 1640995200,
            },
            parentNote: {
              type: 'string',
              description: '학부모 메모',
              example: '병원 방문으로 인한 조퇴',
            },
            schoolNote: {
              type: 'string',
              description: '학교 메모',
              example: '담임 확인 완료',
            },
          },
          required: ['groupKey', 'dailyStudentKey'],
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date with Last Flag
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateWithExtendedDataDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반별 출석 👈 특정 날짜 조회 (확장된 data 포함)',
      description: `
      - 특정 반의 특정 날짜에 대한 출석 정보를 조회합니다.
      - DynamoDB에서 데이터를 조회하여 실시간 출석 상태를 반환합니다.
      - 각 학생의 다음 수업 정보 또는 하교 목적지를 포함합니다.
      
      ### 매개변수:
      - \`groupId\`: 조회할 반의 ID (숫자)
      - \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)
      
      ### 응답 데이터:
      - 해당 날짜의 모든 학생 출석 정보 배열
      - 각 출석 정보에는 학생 정보, 수업 정보, 출석 상태, 다음 수업 정보가 포함됩니다.
      - \`next\`: 해당 학생의 다음 수업명 또는 하교 목적지
      
      ### 출석 상태:
      -  INIT = 'INIT', // 시작전
      -  PRESENT = 'PRESENT', // 출석
      -  ABSENT = 'ABSENT', // 결석
      -  LATE = 'LATE', // 지각
      -  LEFT = 'LEFT', // 조퇴
      -  EXCUSED_ABSENT = 'EXCUSED_ABSENT', // 선결석통보
      -  EXCUSED_LATE = 'EXCUSED_LATE', // 선지각통보
      -  EXCUSED_LEFT = 'EXCUSED_LEFT', // 선조퇴통보
      
      ### 활용 예시:
      - 학생의 다음 수업 안내 시 활용
      - 하교 시간 결정 시 활용
      - 수업 종료 후 다음 수업 장소 안내
      - 학부모 알림 시스템에서 활용
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 정보 조회 성공 (다음 수업 정보 포함)',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            groupKey: {
              type: 'string',
              description: '반 키 (예: GROUP#123)',
              example: 'GROUP#123',
            },
            dailyStudentKey: {
              type: 'string',
              description:
                '일별 학생 키 (예: DATE#2025-01-15#STUDENT#1학년1반-10)',
              example: 'DATE#2025-01-15#STUDENT#1학년1반-10',
            },
            lessonId: {
              type: 'number',
              description: '수업 ID',
              example: 456,
            },
            lessonName: {
              type: 'string',
              description: '수업명',
              example: '수학',
            },
            groupId: {
              type: 'number',
              description: '반 ID',
              example: 123,
            },
            groupName: {
              type: 'string',
              description: '반 이름',
              example: '1학년 1반',
            },
            studentId: {
              type: 'number',
              description: '학생 ID',
              example: 789,
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
                'INIT',
                'PRESENT',
                'ABSENT',
                'LATE',
                'LEFT',
                'EXCUSED_ABSENT',
                'EXCUSED_LATE',
                'EXCUSED_LEFT',
              ],
              description: '출석 상태',
              example: 'PRESENT',
            },
            expires: {
              type: 'number',
              description: 'TTL (Time To Live)',
              example: 1640995200,
            },
            parentNote: {
              type: 'string',
              description: '학부모 메모',
              example: '병원 방문으로 인한 조퇴',
            },
            schoolNote: {
              type: 'string',
              description: '학교 메모',
              example: '담임 확인 완료',
            },
            student: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: '학생 ID',
                  example: 789,
                },
                name: {
                  type: 'string',
                  description: '학생 이름',
                  example: '홍길동',
                },
                grade: {
                  type: 'number',
                  description: '학년',
                  example: 1,
                },
                class: {
                  type: 'string',
                  description: '반',
                  example: '1반',
                },
                studentCode: {
                  type: 'string',
                  description: '학생 코드',
                  example: '123456',
                },
                parent: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'number',
                      description: '학부모 ID',
                      example: 123,
                    },
                    name: {
                      type: 'string',
                      description: '학부모 이름',
                      example: '홍길동 엄마',
                    },
                    phone: {
                      type: 'string',
                      description: '학부모 전화번호',
                      example: '01012345678',
                    },
                  },
                },
              },
            },
            next: {
              type: 'string',
              description: '해당 학생의 다음 수업명 또는 하교 목적지',
              example: '국어 수업',
            },
          },
          required: ['groupKey', 'dailyStudentKey', 'next'],
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Upsert Attendance
//? ---------------------------------------------------------------------- ?//
export const UpsertAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 정보 👈 등록/수정',
      description: `
      - 특정 반의 특정 날짜에 대한 학생의 출석 정보를 등록하거나 수정합니다.
      - 기존 출석 정보가 있으면 업데이트하고, 없으면 새로 생성합니다.
      - DynamoDB를 사용하여 실시간으로 출석 정보를 저장합니다.
      
      ### 매개변수:
      - \`groupId\`: 반의 ID (숫자)
      - \`date\`: 출석 날짜 (YYYY-MM-DD 형식)
      - \`studentId\`: 학생의 ID (숫자)
      
      ### 요청 본문:
      - 출석 상태 및 관련 정보를 포함한 DTO
      
      ### 출석 상태:
      - \`INIT\`: 시작전
      - \`PRESENT\`: 출석
      - \`ABSENT\`: 결석
      - \`LATE\`: 지각 
      - \`LEFT\`: 조퇴
      - \`EXCUSED_ABSENT\`: 선결석통보
      - \`EXCUSED_LATE\`: 선지각통보
      - \`EXCUSED_LEFT\`: 선조퇴통보
      
      ### 응답 데이터:
      - 등록/수정된 출석 정보 객체
      - 학생 정보, 수업 정보, 출석 상태가 모두 포함됩니다.
      
      ### 주의사항:
      - 해당 날짜에 수업이 없는 경우 오류가 발생합니다.
      - 반과 학생이 존재하지 않는 경우 오류가 발생합니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '출석 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiParam({
      name: 'studentId',
      type: 'number',
      description: '학생 ID',
      example: 456,
    }),
    ApiOkResponseTemplate({
      description: '출석 정보 등록/수정 성공',
      type: Object,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Attendance Report
//? ---------------------------------------------------------------------- ?//

export const GetReportDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반별 출석 리포트 👈 특정 날짜 조회',
      description: `
      - 특정 반의 특정 날짜에 대한 출석 리포트를 조회합니다.
      - 학생별로 출석 정보를 그룹화하여 리포트 형태로 반환합니다.
      - 각 학생의 출석 기록이 날짜순으로 정렬되어 제공됩니다.
      
      ### 매개변수:
      - \`groupId\`: 조회할 반의 ID (숫자)
      - \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)
      
      ### 응답 데이터:
      - 학생별로 그룹화된 출석 리포트 배열
      - 각 학생의 출석 기록이 날짜순으로 정렬됨
      
      ### 사용 예시:
      - 반별 출석 현황을 한눈에 파악
      - 학생별 출석 패턴 분석
      - 출석 통계 생성을 위한 데이터 수집
      - 학부모 리포트 생성
      
      ### 출석 상태:
      -  INIT = 'INIT', // 시작전
      -  PRESENT = 'PRESENT', // 출석
      -  ABSENT = 'ABSENT', // 결석
      -  LATE = 'LATE', // 지각
      -  LEFT = 'LEFT', // 조퇴
      -  EXCUSED_ABSENT = 'EXCUSED_ABSENT', // 선결석통보
      -  EXCUSED_LATE = 'EXCUSED_LATE', // 선지각통보
      -  EXCUSED_LEFT = 'EXCUSED_LEFT', // 선조퇴통보
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '출석 리포트 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentKey: {
              type: 'string',
              description: '학생 키',
              example: 'STUDENT#1학년1반-10',
            },
            studentName: {
              type: 'string',
              description: '학생 이름',
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
                    description: '출석 날짜 (YYYY-MM-DD)',
                    example: '2025-01-15',
                  },
                  status: {
                    type: 'string',
                    enum: [
                      'INIT',
                      'PRESENT',
                      'ABSENT',
                      'LATE',
                      'LEFT',
                      'EXCUSED_ABSENT',
                      'EXCUSED_LATE',
                      'EXCUSED_LEFT',
                    ],
                    description: '출석 상태',
                    example: 'PRESENT',
                  },
                },
                required: ['date', 'status'],
              },
            },
          },
          required: ['studentKey', 'studentName', 'attendances'],
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Start Attendance Notification
//? ---------------------------------------------------------------------- ?//

export const StartAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 시작 알림 👈 수업 시작',
      description: `
      - 특정 반의 수업 시작을 알립니다.
      - 출석 체크를 시작하고 관련 학생들에게 알림을 전송합니다.
      
      ### 매개변수:
      - \`groupId\`: 반의 ID (숫자)
      
      ### 요청 본문:
      - \`AttendanceStatusDto[]\`: 학생별 출석 상태 정보 배열
      
      ### 응답 데이터:
      - 알림이 전송된 학생 수
      
      ### 주요 기능:
      - 해당 반 학생들에게 출석 체크 시작 알림 전송
      - 출석 상태를 INIT으로 초기화
      - 실시간 알림 시스템 활성화
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '출석 시작 알림 전송 성공',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? End Attendance Notification
//? ---------------------------------------------------------------------- ?//

export const EndAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '출석 종료 알림 👈 수업 종료',
      description: `
      - 특정 반의 수업 종료를 알립니다.
      - 출석 체크를 마감하고 최종 출석 현황을 정리합니다.
      
      ### 매개변수:
      - \`groupId\`: 반의 ID (숫자)
      
      ### 요청 본문:
      - \`AttendanceStatusDto[]\`: 학생별 출석 상태 정보 배열
      
      ### 응답 데이터:
      - 출석 마감 처리 결과 (숫자)
      
      ### 주요 기능:
      - 해당 반의 출석 체크 마감
      - 미처리된 출석 상태를 ABSENT로 변경
      - 출석 마감 알림 전송
      - 출석 통계 업데이트
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '출석 종료 처리 성공',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
