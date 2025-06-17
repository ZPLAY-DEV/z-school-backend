import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import {
  CreateAttendanceResultDto,
  CreateDynamoRecordWithDateDto,
  CreateDynamoRecordWithRangeDto,
} from 'src/domain/schoolday/dto/create-dynamo-record.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for Schooldays (Date)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceOfSchooldayWithDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '다이나모 출석부 📅 특정 날짜에 대한 모든과목 출석부 생성',
      description: `
      ### 🎯 기능 개요
      - 특정 날짜의 모든 수업일에 대해 출석 데이터를 DynamoDB에 일괄 생성합니다.
      - MySQL에서 Schoolday 데이터를 조회하고, 해당 수업에 참여하는 모든 학생의 출석 기록을 생성합니다.
      
      ### 📝 처리 과정
      1. **데이터 조회**: 지정된 날짜의 모든 Schoolday를 MySQL에서 조회
      2. **관계 데이터 로드**: 각 Schoolday의 그룹, 학생, 과목 정보 포함
      3. **출석 레코드 생성**: 각 학생별로 DynamoDB 출석 기록 생성
      4. **배치 처리**: DynamoDB BatchWrite를 통한 대량 데이터 삽입
      5. **재시도 로직**: 실패한 요청에 대한 지수 백오프 재시도
      
      ### 🔑 키 구조
      - **Partition Key**: \`GROUP#{groupId}\`
      - **Sort Key**: \`DATE#{YYYY-MM-DD}#STUDENT#{digitStudentId}\`
      
      ### 📋 매개변수
      - \`schoolId\`: 학교 ID (선택사항, 미입력 시 모든 학교)
      - \`termId\`: 학기 ID (선택사항, 미입력 시 모든 학기)
      - \`date\`: 대상 날짜 (YYYY-MM-DD 형식, 필수)
      
      ### 📊 응답 데이터
      - \`total\`: 생성된 총 출석 기록 수
      - \`failedBatches\`: 실패한 배치 작업 수
      
      ### ⚡ 성능 최적화
      - 배치 크기: 25개 (DynamoDB 제한)
      - 최대 재시도: 5회
      - 지수 백오프: 100ms × 2^retry
      
      ### ⚠️ 주의사항
      - 종료된 수강생(\`endedOn\` < 수업일)은 제외됩니다.
      - 기본 출석 상태: \`PENDING\`
      - TTL: 생성일로부터 1년 후 자동 삭제
      - 대량 데이터 처리 시 응답 시간이 길어질 수 있습니다.
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithDateDto,
      examples: {
        today: {
          summary: '오늘 날짜 출석 생성',
          description: '2025년 1월 15일 모든 수업의 출석 데이터 생성',
          value: {
            schoolId: 1,
            termId: 1,
            date: '2025-01-15',
          },
        },
        allSchools: {
          summary: '전체 학교 대상',
          description:
            'schoolId와 termId를 생략하여 모든 학교의 해당 날짜 수업 처리',
          value: {
            date: '2025-01-15',
          },
        },
        specificTerm: {
          summary: '특정 학기만',
          description: '특정 학기의 해당 날짜 수업만 처리',
          value: {
            termId: 2,
            date: '2025-01-15',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '출석 데이터 생성 완료',
      type: CreateAttendanceResultDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST, // 400 - 잘못된 데이터
      StatusCodes.NOT_FOUND, // 404 - 데이터 없음
      StatusCodes.UNPROCESSABLE_ENTITY, // 422 - 처리 불가
      StatusCodes.INTERNAL_SERVER_ERROR, // 500 - DB 오류
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for Schooldays (Range)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceOfSchooldayWithPeriodDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '다이나모 출석부 📅 지정한 기간동안에 대한 모든과목 출석부 생성',
      description: `
      ### 🎯 기능 개요
      - 지정된 기간 내의 모든 수업일에 대해 출석 데이터를 DynamoDB에 일괄 생성합니다.
      - MySQL에서 Schoolday 데이터를 조회하고, 해당 수업에 참여하는 모든 학생의 출석 기록을 생성합니다.
      
      ### 📝 처리 과정
      1. **기간 설정**: from(00:00:00) ~ to(23:59:59) 범위로 UTC 변환
      2. **데이터 조회**: 지정된 기간 내 모든 Schoolday를 MySQL에서 조회
      3. **관계 데이터 로드**: 각 Schoolday의 그룹, 학생, 과목 정보 포함
      4. **출석 레코드 생성**: 각 학생별로 DynamoDB 출석 기록 생성
      5. **배치 처리**: DynamoDB BatchWrite를 통한 대량 데이터 삽입
      6. **재시도 로직**: 실패한 요청에 대한 지수 백오프 재시도
      
      ### 🔑 키 구조
      - **Partition Key**: \`GROUP#{groupId}\`
      - **Sort Key**: \`DATE#{YYYY-MM-DD}#STUDENT#{digitStudentId}\`
      
      ### 📋 매개변수
      - \`schoolId\`: 학교 ID (선택사항, 미입력 시 모든 학교)
      - \`termId\`: 학기 ID (선택사항, 미입력 시 모든 학기)
      - \`from\`: 시작 날짜 (YYYY-MM-DD 형식, 필수)
      - \`to\`: 종료 날짜 (YYYY-MM-DD 형식, 필수)
      
      ### 📊 응답 데이터
      - \`total\`: 생성된 총 출석 기록 수
      - \`failedBatches\`: 실패한 배치 작업 수
      
      ### ⚡ 성능 최적화
      - 배치 크기: 25개 (DynamoDB 제한)
      - 최대 재시도: 5회
      - 지수 백오프: 100ms × 2^retry
      
      ### ⚠️ 주의사항
      - 종료된 수강생(\`endedOn\` < 수업일)은 제외됩니다.
      - 기본 출석 상태: \`PENDING\`
      - TTL: 생성일로부터 1년 후 자동 삭제
      - 대량 데이터 처리 시 응답 시간이 매우 길어질 수 있습니다.
      - 기간이 클수록 메모리 사용량이 증가합니다.
      
      ### 💡 권장 사용법
      - 학기 초 일괄 출석 데이터 생성
      - 월별 또는 주별 단위로 분할 처리 권장
      - 대량 처리 시 백그라운드 작업 고려
      `,
    }),
    ApiBody({
      type: CreateDynamoRecordWithRangeDto,
      examples: {
        week: {
          summary: '일주일 기간 출석 생성',
          description: '2025년 1월 15일부터 21일까지의 출석 데이터 생성',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-15',
            to: '2025-01-21',
          },
        },
        month: {
          summary: '한 달 기간 출석 생성',
          description: '2025년 1월 전체의 출석 데이터 생성',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-01',
            to: '2025-01-31',
          },
        },
        allSchools: {
          summary: '전체 학교 대상',
          description: 'schoolId를 생략하여 모든 학교의 해당 기간 처리',
          value: {
            termId: 1,
            from: '2025-01-01',
            to: '2025-01-07',
          },
        },
        fullTerm: {
          summary: '학기 전체 처리',
          description: '학기 전체 기간의 출석 데이터 생성 (주의: 대량 데이터)',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-01',
            to: '2025-06-30',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '출석 데이터 생성 완료',
      type: CreateAttendanceResultDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST, // 400 - 잘못된 데이터
      StatusCodes.NOT_FOUND, // 404 - 데이터 없음
      StatusCodes.UNPROCESSABLE_ENTITY, // 422 - 처리 불가
      StatusCodes.INTERNAL_SERVER_ERROR, // 500 - DB 오류
    ),
  );
};
