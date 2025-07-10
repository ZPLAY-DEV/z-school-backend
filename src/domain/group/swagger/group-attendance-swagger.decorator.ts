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
      summary: '📅 특정 날짜 반별 출석 조회',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜에 대한 출석 정보를 DynamoDB에서 실시간 조회합니다.
해당 날짜의 모든 학생 출석 정보를 배열로 반환합니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 응답 데이터
- 각 학생의 출석 정보 (학생명, 수업 정보, 출석 상태 포함)
- DynamoDB 키 구조: GROUP#{groupId}, DATE#{date}#STUDENT#{studentId}

### 🏷️ 출석 상태 종류
INIT, PRESENT, ABSENT, LATE, LEFT, EXCUSED_ABSENT, EXCUSED_LATE, EXCUSED_LEFT

### 💡 주요 활용
- 강사의 실시간 출석 확인
- 학부모의 자녀 출석 상태 조회  
- 관리자의 반별 출석 현황 모니터링
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
              example: 'GROUP#123',
            },
            dailyStudentKey: {
              type: 'string',
              example: 'DATE#2025-01-15#STUDENT#1학년1반-10',
            },
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            lessonName: {
              type: 'string',
              example: '수학',
            },
            status: {
              type: 'string',
              enum: ['INIT', 'PRESENT', 'ABSENT', 'LATE', 'LEFT'],
              example: 'PRESENT',
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date with Extended Data
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateWithExtendedDataDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜 반별 출석 조회 (확장 정보 포함)',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜 출석 정보를 조회하되, 다음 수업 정보나 하교 목적지까지 포함하여 반환합니다.
수업 종료 후 학생 안내나 학부모 알림에 활용됩니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 확장 정보
- \`next\`: 해당 학생의 다음 수업명 또는 하교 목적지
- \`student\`: 학생 상세 정보 (학년, 반, 학부모 정보 포함)

### 💡 주요 활용
- 수업 종료 후 다음 수업 장소 안내
- 하교 시간 결정 및 학부모 알림
- 학생 동선 관리 및 안전 확보

### ⚠️ 주의사항
- 일반 조회보다 응답 데이터가 크므로 필요시에만 사용
- 개인정보 포함으로 권한 확인 필요
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
      description: '출석 정보 조회 성공 (확장 정보 포함)',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            status: {
              type: 'string',
              example: 'PRESENT',
            },
            next: {
              type: 'string',
              description: '다음 수업명 또는 하교 목적지',
              example: '국어 수업',
            },
            student: {
              type: 'object',
              description: '학생 상세 정보',
            },
          },
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
      summary: '✏️ 출석 정보 등록/수정',
      description: `
### 🎯 기능 개요
특정 학생의 출석 정보를 등록하거나 수정합니다.
기존 출석 정보가 있으면 업데이트하고, 없으면 새로 생성합니다.

### 📋 매개변수
- \`groupId\`: 반 ID (숫자)
- \`date\`: 출석 날짜 (YYYY-MM-DD 형식)
- \`studentId\`: 학생 ID (숫자)

### 📝 요청 본문
- 출석 상태 및 관련 메모 정보
- 학부모 메모, 학교 메모 포함 가능

### 🏷️ 출석 상태
- PRESENT: 출석, ABSENT: 결석, LATE: 지각, LEFT: 조퇴
- EXCUSED_*: 사전 통보된 상태들

### 💡 주요 활용
- 강사의 실시간 출석 체크
- 관리자의 출석 정정
- 사전 통보 처리 (병원, 조퇴 등)

### ⚠️ 주의사항
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
      summary: '📊 반별 출석 리포트 조회',
      description: `
### 🎯 기능 개요
특정 반의 특정 날짜에 대한 출석 리포트를 학생별로 그룹화하여 조회합니다.
각 학생의 출석 기록이 날짜순으로 정렬되어 제공됩니다.

### 📋 매개변수
- \`groupId\`: 조회할 반 ID (숫자)
- \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)

### 📊 응답 데이터
- 학생별로 그룹화된 출석 리포트
- 각 학생의 출석 기록 배열 (날짜순 정렬)

### 💡 주요 활용
- 반별 출석 현황 한눈에 파악
- 학생별 출석 패턴 분석
- 출석 통계 생성용 데이터 수집
- 학부모 리포트 생성

### 📈 데이터 구조
- studentKey: 학생 식별자
- studentName: 학생 이름
- attendances: 출석 기록 배열 (날짜별 상태)
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
              example: 'STUDENT#1학년1반-10',
            },
            studentName: {
              type: 'string',
              example: '홍길동',
            },
            attendances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    example: '2025-01-15',
                  },
                  status: {
                    type: 'string',
                    example: 'PRESENT',
                  },
                },
              },
            },
          },
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
      summary: '🔔 출석 시작 알림',
      description: `
### 🎯 기능 개요
특정 반의 수업 시작을 알리고 출석 체크를 시작합니다.
해당 반 학생들에게 출석 시작 알림을 전송합니다.

### 📋 매개변수
- \`groupId\`: 반 ID (숫자)

### 📝 요청 본문
- \`AttendanceStatusDto[]\`: 학생별 출석 상태 정보 배열

### 🔔 주요 기능
- 해당 반 학생들에게 출석 체크 시작 알림 전송
- 출석 상태를 INIT으로 초기화
- 실시간 알림 시스템 활성화
- 강사 대시보드에 출석 현황 표시

### 📊 응답 데이터
- 알림이 전송된 학생 수 반환

### 💡 활용 시나리오
- 수업 시작 시 자동 호출
- 강사가 수동으로 출석 체크 시작
- 지각 학생 관리 시작점
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
      summary: '🔕 출석 종료 알림',
      description: `
### 🎯 기능 개요
특정 반의 수업 종료를 알리고 출석 체크를 마감합니다.
미처리된 출석 상태를 정리하고 최종 출석 현황을 확정합니다.

### 📋 매개변수
- \`groupId\`: 반 ID (숫자)

### 📝 요청 본문
- \`AttendanceStatusDto[]\`: 학생별 최종 출석 상태 정보 배열

### 🔕 주요 기능
- 해당 반의 출석 체크 마감
- 미처리된 출석 상태를 ABSENT로 자동 변경
- 출석 마감 알림 전송
- 출석 통계 및 리포트 업데이트

### 📊 응답 데이터
- 출석 마감 처리 결과 (숫자)

### 💡 활용 시나리오
- 수업 종료 시 자동 호출
- 강사가 수동으로 출석 마감
- 일일 출석 정리 작업
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

//? ---------------------------------------------------------------------- ?//
//? Custom Attendance Notification
//? ---------------------------------------------------------------------- ?//
export const CustomAttendanceDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 커스텀 출석 처리',
      description: `
### 🎯 기능 개요
특정 반의 출석 상태를 사용자 정의 방식으로 처리합니다.
일반적인 시작/종료 프로세스와는 별도로 유연한 출석 처리가 가능합니다.

### 📋 매개변수
- \`groupId\`: 대상 반의 ID (숫자)

### 📝 요청 본문
- \`CreateAttendanceWithKeyDto[]\`: 학생별 출석 상태 정보 배열

### 🎯 사용 시나리오
- **보강 수업**: 정규 수업 시간 외 추가 수업
- **특별 활동**: 체험학습, 견학 등 일반 수업과 다른 형태
- **긴급 상황**: 급작스러운 일정 변경이나 임시 조치
- **수동 조정**: 출석 상태의 수동 보정이 필요한 경우

### 🔧 주요 기능
- 표준 출석 프로세스를 우회한 직접적인 출석 상태 설정
- 실시간 알림 시스템과 연동
- 출석 기록의 즉시 반영

### 📊 응답 데이터
- 처리된 학생 수 (숫자)
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'number',
      description: '반 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '커스텀 출석 처리 성공',
      type: Number,
      isArray: false,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
