import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import {
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
  DeleteAttendanceBySchoolTermDto,
  ResponseAttendanceDto,
} from 'src/domain/schoolday/dto/response-attendance.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for All Valid Terms (Public)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceForAllValidTermsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🌐 전체 유효 학기 출석부 일괄 생성 (Public)',
      description: `
### 🎯 기능 개요
시스템 내 모든 유효한 학기의 특정 날짜 출석 데이터를 일괄 생성합니다.
Public 엔드포인트로 시스템 자동화 및 배치 작업에 사용됩니다.

### 📝 처리 내용
- **자동 탐지**: 현재 활성화된 모든 학기 자동 조회
- **병렬 처리**: 학기별 독립적인 배치 생성
- **실패 격리**: 일부 학기 실패가 전체에 영향 주지 않음
- **결과 통합**: 모든 학기의 생성 결과 통합 반환

### 💡 주요 활용
- 매일 자정 배치 작업으로 다음날 출석부 사전 생성
- 시스템 장애 후 누락 데이터 보완
- 새 학기 시작 시 일괄 설정

### ⚠️ 주의사항
- 대량 데이터 처리로 긴 응답 시간 가능
- DynamoDB 용량 제한 고려 필요
- Public 엔드포인트이므로 남용 방지 필요
      `,
    }),
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            format: 'date',
            description: '대상 날짜 (YYYY-MM-DD), 미입력 시 오늘 날짜 사용',
            example: '2025-01-15',
          },
        },
      },
      examples: {
        today: {
          summary: '오늘 날짜 처리',
          value: {},
        },
        specificDate: {
          summary: '특정 날짜 처리',
          value: { date: '2025-01-15' },
        },
        pastDate: {
          summary: '과거 날짜 보완',
          value: { date: '2025-01-10' },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '전체 학기 출석 데이터 생성 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for Schooldays (Date)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceOfSchooldayWithDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜 출석부 생성',
      description: `
### 🎯 기능 개요
특정 날짜의 모든 수업일에 대해 출석 데이터를 DynamoDB에 일괄 생성합니다.
MySQL에서 Schoolday 데이터를 조회하고, 해당 수업에 참여하는 모든 학생의 출석 기록을 생성합니다.

### 🔑 DynamoDB 키 구조
- **Partition Key**: \`GROUP#{groupId}\`
- **Sort Key**: \`DATE#{YYYY-MM-DD}#STUDENT#{digitStudentId}\`

### 📋 필터링 옵션
- \`schoolId\`: 특정 학교로 제한 (선택사항)
- \`termId\`: 특정 학기로 제한 (선택사항)
- \`date\`: 대상 날짜 (필수)

### ⚡ 성능 특징
- 배치 크기: 25개 (DynamoDB 제한)
- 최대 재시도: 5회
- 지수 백오프: 100ms × 2^retry

### ⚠️ 주의사항
- 종료된 수강생(\`end\` < 수업일)은 제외
- 기본 출석 상태: \`PENDING\`
- TTL: 생성일로부터 1년 후 자동 삭제
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithDateDto,
      examples: {
        today: {
          summary: '오늘 날짜 출석 생성',
          value: { schoolId: 1, termId: 1, date: '2025-01-15' },
        },
        allSchools: {
          summary: '전체 학교 대상',
          value: { date: '2025-01-15' },
        },
        specificTerm: {
          summary: '특정 학기만',
          value: { termId: 2, date: '2025-01-15' },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '출석 데이터 생성 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for Schooldays (Range)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceOfSchooldayWithPeriodDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 기간별 출석부 생성',
      description: `
### 🎯 기능 개요
지정된 기간 내의 모든 수업일에 대해 출석 데이터를 DynamoDB에 일괄 생성합니다.
대량 데이터 처리에 최적화되어 있으며, 학기 초 일괄 설정에 주로 사용됩니다.

### 📝 처리 과정
1. **기간 설정**: from(00:00:00) ~ to(23:59:59) 범위로 UTC 변환
2. **데이터 조회**: 지정 기간 내 모든 Schoolday를 MySQL에서 조회
3. **배치 처리**: DynamoDB BatchWrite를 통한 대량 데이터 삽입
4. **재시도 로직**: 실패한 요청에 대한 지수 백오프 재시도

### 📋 매개변수
- \`schoolId\`: 학교 ID (선택사항)
- \`termId\`: 학기 ID (선택사항)
- \`from\`: 시작 날짜 (필수)
- \`to\`: 종료 날짜 (필수)

### 💡 권장 사용법
- 학기 초 일괄 출석 데이터 생성
- 월별 또는 주별 단위로 분할 처리 권장
- 대량 처리 시 백그라운드 작업 고려

### ⚠️ 주의사항
- 기간이 클수록 처리 시간 및 메모리 사용량 증가
- DynamoDB 용량 제한 고려 필요
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithRangeDto,
      examples: {
        week: {
          summary: '일주일 기간',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-15',
            to: '2025-01-21',
          },
        },
        month: {
          summary: '한 달 기간',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-01',
            to: '2025-01-31',
          },
        },
        allSchools: {
          summary: '전체 학교 대상',
          value: {
            termId: 1,
            from: '2025-01-01',
            to: '2025-01-07',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '출석 데이터 생성 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Attendance by School and Term (Public)
//? ---------------------------------------------------------------------- ?//
export const DeleteAttendancesBySchoolAndTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 학교/학기별 출석부 전체 삭제 (Public)',
      description: `
### 🎯 기능 개요
특정 학교와 학기의 모든 출석 데이터를 DynamoDB에서 일괄 삭제합니다.
학기 종료 후 데이터 정리나 시스템 재설정 시 사용됩니다.

### 📝 처리 과정
1. **범위 조회**: 해당 학교/학기의 모든 그룹 ID 수집
2. **배치 삭제**: DynamoDB BatchWrite를 통한 대량 삭제
3. **재시도 로직**: 실패한 삭제 요청에 대한 지능형 재시도
4. **정리 확인**: 모든 데이터 삭제 완료 검증

### 🔄 삭제 범위
- 해당 학교/학기의 모든 그룹 포함
- 학기 전체 기간의 출석 데이터
- 각 그룹에 속한 모든 학생의 기록

### 💡 주요 사용 사례
- 완료된 학기의 출석 데이터 정리
- 테스트 데이터 일괄 삭제
- 시스템 마이그레이션 준비

### ⚠️ 위험성 및 주의사항
- **복구 불가능**: 삭제된 데이터는 복구할 수 없음
- **대량 작업**: 처리 시간이 매우 오래 걸릴 수 있음
- **시스템 부하**: DynamoDB 읽기/쓰기 용량 대량 소모
- 실행 전 반드시 백업 확인 필요
      `,
    }),
    ApiBody({
      type: DeleteAttendanceBySchoolTermDto,
      examples: {
        schoolAndTerm: {
          summary: '특정 학교/학기 삭제',
          value: { schoolId: 1, termId: 1 },
        },
        endedTerm: {
          summary: '종료된 학기 정리',
          value: { schoolId: 2, termId: 3 },
        },
        testData: {
          summary: '테스트 데이터 삭제',
          value: { schoolId: 999, termId: 999 },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '출석 데이터 삭제 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Attendance by Date (Public)
//? ---------------------------------------------------------------------- ?//
export const DeleteAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 특정 날짜 출석부 삭제 (Public)',
      description: `
### 🎯 기능 개요
특정 날짜의 출석 데이터를 DynamoDB에서 선택적으로 삭제합니다.
잘못 생성된 출석부나 오류 데이터 수정 시 사용됩니다.

### 🎯 삭제 범위 제어
- **학교 지정**: 특정 학교의 해당 날짜만 삭제
- **학기 지정**: 특정 학기의 해당 날짜만 삭제
- **전체 삭제**: 모든 학교/학기의 해당 날짜 삭제
- **조건 조합**: 학교+학기 조합으로 정밀 제어

### 💡 활용 시나리오
- 잘못된 날짜에 생성된 출석부 제거
- 휴일로 변경된 날짜의 출석부 삭제
- 수업 취소로 인한 해당 날짜 정리
- 중복 생성된 출석 데이터 정리

### 🔍 삭제 조건 옵션
- \`schoolId\`: 특정 학교만 삭제 (선택사항)
- \`termId\`: 특정 학기만 삭제 (선택사항)
- \`date\`: 대상 날짜 (필수)

### ⚠️ 주의사항
- **즉시 삭제**: 실행 즉시 데이터가 삭제됨
- **복구 불가**: 삭제된 데이터는 복구할 수 없음
- **연관 영향**: 출석 통계 및 리포트에 영향 가능
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithDateDto,
      examples: {
        specificSchoolDate: {
          summary: '특정 학교의 특정 날짜 삭제',
          value: { schoolId: 1, termId: 1, date: '2025-01-15' },
        },
        wrongDate: {
          summary: '잘못 생성된 날짜 삭제',
          value: { date: '2025-12-31' },
        },
        holidayCorrection: {
          summary: '휴일 출석부 삭제',
          value: { schoolId: 1, date: '2025-01-01' },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '특정 날짜 출석 데이터 삭제 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Attendance by Period (Public)
//? ---------------------------------------------------------------------- ?//
export const DeleteAttendanceByPeriodDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 기간별 출석부 삭제 (Public)',
      description: `
### 🎯 기능 개요
지정된 기간 내의 모든 출석 데이터를 DynamoDB에서 일괄 삭제합니다.
대량의 오류 데이터나 테스트 데이터 정리에 최적화되어 있습니다.

### 📝 처리 과정
1. **기간 검증**: from ~ to 날짜 범위 유효성 확인
2. **대상 수집**: 기간 내 모든 출석 기록 식별
3. **순차 삭제**: 날짜별 순차 처리로 안정성 확보
4. **진행 추적**: 실시간 삭제 진행 상황 모니터링

### 🗓️ 기간 설정 옵션
- **정확한 범위**: from(00:00:00) ~ to(23:59:59)
- **유연한 조합**: 학교/학기 조건과 기간 조합 가능
- **경계 포함**: 시작일과 종료일 모두 포함

### 💡 주요 활용 사례
- 학기별 종료 후 일괄 정리
- 시범 운영 기간 데이터 삭제
- 잘못된 기간에 생성된 출석부 제거
- 오래된 데이터 정리로 성능 최적화

### 📊 삭제 범위 제어
- \`schoolId\`: 특정 학교로 제한 (선택사항)
- \`termId\`: 특정 학기로 제한 (선택사항)
- \`from\`: 시작 날짜 (필수)
- \`to\`: 종료 날짜 (필수)

### ⚠️ 위험성 및 주의사항
- **대량 삭제**: 매우 많은 데이터가 삭제될 수 있음
- **장시간 처리**: 기간이 클수록 처리 시간 증가
- **복구 불가**: 삭제 후 데이터 복구 불가능
- 최대 기간: 1년 이내 권장
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithRangeDto,
      examples: {
        weekPeriod: {
          summary: '일주일 기간 삭제',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-15',
            to: '2025-01-21',
          },
        },
        monthlyCleanup: {
          summary: '월별 정리',
          value: {
            schoolId: 1,
            from: '2025-01-01',
            to: '2025-01-31',
          },
        },
        testDataCleanup: {
          summary: '테스트 데이터 정리',
          value: {
            from: '2024-12-01',
            to: '2024-12-31',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '기간별 출석 데이터 삭제 완료',
      type: ResponseAttendanceDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.REQUEST_TIMEOUT,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};
