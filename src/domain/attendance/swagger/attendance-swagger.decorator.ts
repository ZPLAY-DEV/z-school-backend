import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import {
  AttendanceKeyDto,
  UpsertAttendanceDto,
} from '../dto/upsert-attendance.dto';

// Fetch Attendance Records
export const FetchAttendanceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📋 출석 목록 조회',
      description: `
**📝 기능 설명**
- 출석 기록을 페이지네이션과 함께 조회합니다
- groupId가 있으면 특정 그룹만, 없으면 전체 데이터를 스캔합니다
- count 파라미터로 조회할 항목 수를 지정할 수 있습니다 (기본값: 20)

**🔄 비즈니스 로직**
1. **특정 그룹 조회**: groupId 제공 시 해당 그룹의 출석 기록만 조회
2. **전체 스캔**: groupId 미제공 시 모든 그룹의 출석 기록 스캔
3. **페이지네이션**: cursor 기반으로 다음 페이지 조회 가능
4. **정렬**: dailyStudentKey 기준 내림차순 (최신순)

**📊 응답 데이터 구조**
- items: 출석 기록 배열 (최대 count개, 기본 20개)
- count: 현재 페이지의 항목 수
- nextCursor: 다음 페이지를 위한 커서 (Base64 인코딩)
- hasMore: 다음 페이지 존재 여부
- totalScanned: 전체 스캔 시에만 제공되는 총 스캔 수

**⚠️ 중요 제약사항**
- cursor는 반드시 이전 응답에서 받은 nextCursor 값 사용
- 잘못된 cursor 형식 시 400 오류 발생
- 전체 스캔은 많은 비용이 소모될 수 있으므로 주의

**📚 사용 시나리오**
1. **특정 반 출석 관리**: 1학년 1반 출석 현황 확인
2. **전체 출석 모니터링**: 모든 반의 출석률 통계 생성
3. **페이지별 조회**: 대용량 데이터를 청크별로 처리
4. **대량 데이터 처리**: count=100으로 많은 항목을 한 번에 조회
5. **모바일 최적화**: count=10으로 작은 페이지 크기 사용
      `,
    }),
    ApiQuery({
      name: 'groupId',
      required: false,
      type: Number,
      description: `
**그룹 ID (선택사항)**
- 제공 시: 특정 그룹의 출석 기록만 조회
- 미제공 시: 전체 테이블 스캔 (모든 그룹)
- 예시: 123 → GROUP#123 키로 조회
      `,
      example: 123,
    }),
    ApiQuery({
      name: 'cursor',
      required: false,
      type: String,
      description: `
**페이지네이션 커서 (선택사항)**
- 이전 응답의 nextCursor 값을 그대로 사용
- Base64로 인코딩된 DynamoDB lastKey
- 첫 페이지 조회 시에는 생략
- 잘못된 형식 시 400 오류 발생
      `,
      example:
        'eyJncm91cEtleSI6IkdST1VQIzEyMyIsImRhaWx5U3R1ZGVudEtleSI6IkRBVEUjMjAyNS0wMS0xNSNTVFVERU5UIzEyMyMxLUEtMDEifQ==',
    }),
    ApiQuery({
      name: 'count',
      required: false,
      type: Number,
      description: `
**조회할 항목 수 (선택사항)**
- 한 페이지에서 조회할 출석 기록의 최대 개수
- 기본값: 20개
- 1 이상의 정수만 유효
- 0 이하의 값은 기본값으로 처리
- DynamoDB 성능을 위해 적절한 값 사용 권장
      `,
      example: 50,
    }),
    ApiOkResponse({
      description: '출석 목록 조회 성공',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: '출석 기록 배열',
            items: {
              type: 'object',
              properties: {
                groupKey: { type: 'string', example: 'GROUP#123' },
                dailyStudentKey: {
                  type: 'string',
                  example: 'DATE#2025-01-15#STUDENT#123#1-A-01',
                },
                lessonId: { type: 'number', example: 1 },
                lessonName: { type: 'string', example: '수학' },
                groupId: { type: 'number', example: 123 },
                groupName: { type: 'string', example: '1학년1반' },
                studentId: { type: 'number', example: 123 },
                studentName: { type: 'string', example: '김철수' },
                start: { type: 'string', example: '14:00' },
                end: { type: 'string', example: '15:00' },
                duration: { type: 'number', example: 60 },
                status: { type: 'string', example: 'PRESENT' },
                parentNote: {
                  type: 'string',
                  example: '감사합니다',
                  nullable: true,
                },
                schoolNote: {
                  type: 'string',
                  example: '잘 참여했습니다',
                  nullable: true,
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          count: {
            type: 'number',
            example: 15,
            description: '현재 페이지 항목 수',
          },
          nextCursor: {
            type: 'string',
            nullable: true,
            example:
              'eyJncm91cEtleSI6IkdST1VQIzEyMyIsImRhaWx5U3R1ZGVudEtleSI6IkRBVEUjMjAyNS0wMS0xNSNTVFVERU5UIzEyMyMxLUEtMDEifQ==',
            description: '다음 페이지를 위한 Base64 인코딩된 커서',
          },
          hasMore: {
            type: 'boolean',
            example: true,
            description: '다음 페이지 존재 여부',
          },
          totalScanned: {
            type: 'number',
            nullable: true,
            example: 15,
            description: '전체 스캔 시에만 제공 (groupId 없을 때)',
          },
        },
        example: {
          items: [
            {
              groupKey: 'GROUP#123',
              dailyStudentKey: 'DATE#2025-01-15#STUDENT#123#1-A-01',
              lessonId: 1,
              lessonName: '수학',
              groupId: 123,
              groupName: '1학년1반',
              studentId: 123,
              studentName: '김철수',
              start: '14:00',
              end: '15:00',
              duration: 60,
              status: 'PRESENT',
              parentNote: '감사합니다',
              schoolNote: '잘 참여했습니다',
              createdAt: '2025-01-15T14:00:00Z',
              updatedAt: '2025-01-15T14:00:00Z',
            },
          ],
          count: 1,
          nextCursor:
            'eyJncm91cEtleSI6IkdST1VQIzEyMyIsImRhaWx5U3R1ZGVudEtleSI6IkRBVEUjMjAyNS0wMS0xNSNTVFVERU5UIzEyMyMxLUEtMDEifQ==',
          hasMore: true,
          totalScanned: 1,
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 - 커서 형식 오류 또는 DynamoDB 쿼리 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example:
              '유효하지 않은 커서 형식입니다. 올바른 Base64 인코딩된 커서를 제공해주세요.',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

// Upsert Attendance Record
export const UpsertAttendanceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 출석 기록 수정/생성',
      description: `
**📝 기능 설명**
- Body에 키와 출석 데이터를 모두 포함하여 upsert 수행
- 기존 레코드가 있으면 업데이트, 없으면 새로 생성
- DynamoDB의 upsert 특성을 활용한 안전한 데이터 조작
- URL 특수문자 문제 없이 # 문자 그대로 전송 가능

**🔄 비즈니스 로직**
1. Request body에서 완전한 출석 데이터 (키 포함) 수신
2. 키 형식 유효성 검증 수행
3. DynamoDB에 upsert 수행 (생성 또는 업데이트)

**🔐 키 형식**
- Body에 포함된 키 형식
- groupKey: "GROUP#숫자" 형식 (예: GROUP#123)
- dailyStudentKey: "DATE#YYYY-MM-DD#STUDENT#숫자#클래스정보" 형식

**⚠️ 중요 제약사항**
- groupKey와 dailyStudentKey는 필수 필드
- 키 형식이 올바르지 않으면 400 오류 발생
- Body에 모든 출석 데이터 포함 필요

**📚 사용 시나리오**
1. **출석 상태 변경**: PRESENT → ABSENT 등 상태 업데이트
2. **메모 추가/수정**: 학부모 메모나 학교 메모 추가
3. **출석 기록 생성**: 새로운 날짜의 출석 기록 생성
4. **벌크 데이터 수정**: 여러 필드를 한 번에 업데이트
      `,
    }),
    ApiBody({
      type: UpsertAttendanceDto,
      description: '키를 포함한 완전한 출석 데이터',
      examples: {
        upsertAttendance: {
          summary: '출석 상태 업데이트',
          description: '학생의 출석 상태와 메모를 업데이트',
          value: {
            groupKey: 'GROUP#146',
            dailyStudentKey: 'DATE#2025-07-04#STUDENT#199#2-4-24',
            status: 'PRESENT',
            parentNote: '감사합니다',
            schoolNote: '잘 참여했습니다',
          },
        },
        createAttendance: {
          summary: '새 출석 기록 생성',
          description: '완전한 출석 데이터로 새 기록 생성',
          value: {
            groupKey: 'GROUP#146',
            dailyStudentKey: 'DATE#2025-07-04#STUDENT#199#2-4-24',
            lessonId: 1,
            lessonName: '수학',
            groupId: 146,
            groupName: '2학년4반',
            studentId: 199,
            studentName: '김철수',
            start: '14:00',
            end: '15:00',
            duration: 60,
            status: 'PRESENT',
            parentNote: '감사합니다',
            schoolNote: '잘 참여했습니다',
          },
        },
      },
    }),
    ApiOkResponse({
      description: '출석 기록 upsert 성공',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '출석 기록이 성공적으로 처리되었습니다.',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 - 키 형식 오류 또는 DynamoDB 작업 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'groupKey는 GROUP#숫자 형식이어야 합니다. (예: GROUP#123)',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

// Delete Attendance Record
export const DeleteAttendanceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 출석 기록 삭제',
      description: `
**📝 기능 설명**
- 특정 출석 기록을 완전히 삭제합니다
- DynamoDB에서 복합 키(groupKey + dailyStudentKey)를 이용한 삭제
- 삭제 후 복구가 불가능하므로 신중하게 사용해야 합니다

**🔄 비즈니스 로직**
1. groupKey와 dailyStudentKey 조합으로 출석 기록 식별
2. 키 형식 유효성 검증 수행
3. DynamoDB에서 해당 항목 완전 삭제
4. 삭제 성공 시 확인 메시지 반환

**🔐 키 형식 검증**
- groupKey: "GROUP#숫자" 형식 (예: GROUP#123)
- dailyStudentKey: "DATE#YYYY-MM-DD#STUDENT#숫자#클래스정보" 형식
- 정규표현식을 통한 엄격한 형식 검증

**⚠️ 중요 제약사항**
- 삭제된 데이터는 복구 불가능
- 존재하지 않는 키로 삭제 시도해도 오류 발생하지 않음
- 키 형식이 올바르지 않으면 400 오류 발생

**📚 삭제 시나리오**
1. **잘못 입력된 출석**: 중복 생성된 출석 기록 정리
2. **테스트 데이터 정리**: 개발 중 생성된 불필요한 데이터 삭제
3. **개인정보 삭제 요청**: GDPR 등 법적 요구사항 대응
      `,
    }),
    ApiBody({
      type: AttendanceKeyDto,
      description: '삭제할 출석 기록의 복합 키',
      examples: {
        standardDelete: {
          summary: '일반적인 출석 기록 삭제',
          description: '2025년 1월 15일 1학년 A반 김철수 학생의 출석 기록 삭제',
          value: {
            groupKey: 'GROUP#123',
            dailyStudentKey: 'DATE#2025-01-15#STUDENT#123#1-A-01',
          },
        },
        testDataDelete: {
          summary: '테스트 데이터 삭제',
          description: '개발 중 생성된 테스트 출석 기록 삭제',
          value: {
            groupKey: 'GROUP#999',
            dailyStudentKey: 'DATE#2025-01-01#STUDENT#999#TEST-CLASS',
          },
        },
      },
    }),
    ApiOkResponse({
      description: '출석 기록 삭제 성공',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '출석 기록이 성공적으로 삭제되었습니다.',
            description: '삭제 성공 확인 메시지',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 - 키 형식 오류 또는 유효성 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            oneOf: [
              {
                type: 'string',
                example: 'groupKey와 dailyStudentKey는 필수입니다.',
              },
              {
                type: 'string',
                example:
                  'groupKey는 GROUP#숫자 형식이어야 합니다. (예: GROUP#123)',
              },
              {
                type: 'string',
                example:
                  'dailyStudentKey는 DATE#YYYY-MM-DD#STUDENT#숫자#클래스정보 형식이어야 합니다.',
              },
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description:
        '출석 기록을 찾을 수 없음 (실제로는 DynamoDB 특성상 발생하지 않음)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: '출석 기록을 찾을 수 없습니다.' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
