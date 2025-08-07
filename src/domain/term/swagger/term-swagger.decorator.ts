import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { CreateTermDto } from '../dto/create-term.dto';
import { UpdateTermDto } from '../dto/update-term.dto';
import { Term } from '../entities/term.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Term
//? ---------------------------------------------------------------------- ?//

export const CreateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 학기(Term) 생성',
      description: `
### 📋 기능 개요
- 새로운 학기를 생성합니다
- 학교별 학기 정보를 설정하고 수강신청 일정을 관리합니다
- 정규학기, 특별프로그램 등 다양한 학기 유형을 지원합니다

### 🎯 비즈니스 규칙
- **필수 정보**: 학교명(schoolName), 학사년도(schoolYear), 학기명(termName), 시작일(start), 종료일(end)
- **날짜 제약**: 종료일은 시작일보다 늦어야 함
- **수강신청 일정**: 수강신청 시작/종료 일시는 학기 시작 전이어야 함
- **수강신청 준비**: bookingStart 설정 시 자동으로 offerings 테이블 생성

### 📝 요청 예시
\`\`\`json
{
  "schoolId": 1,
  "schoolName": "홍익대학교 사범대학 부속 초등학교",
  "schoolYear": 2025,
  "termName": "1학기",
  "start": "2025-03-01",
  "end": "2025-09-04",
  "pickRule": "RANDOM",
  "type": "REGULAR"
}
\`\`\`

### ✅ 성공 응답
- **HTTP 201**: 학기 생성 완료
- **응답 데이터**: 생성된 학기의 전체 정보 (ID 포함)

### ❌ 실패 케이스
- **400 Bad Request**: 유효하지 않은 입력 데이터
  - 종료일이 시작일보다 이른 경우
  - 잘못된 날짜 형식 (YYYY-MM-DD가 아닌 경우)
  - 수강신청 일정이 학기 시작 후인 경우
  - 학사년도가 유효 범위를 벗어나는 경우

### 🔄 후속 작업
1. 수업(Lesson) 등록
2. 수강신청 과목(Offering) 생성
3. 학생 배정 및 수강신청 오픈
4. 반(Group) 구성 및 운영
      `,
    }),
    ApiBody({
      type: CreateTermDto,
      description: '학기 생성 정보',
      examples: {
        spring: {
          summary: '1학기 생성',
          description: '정규 1학기 생성 (3월~8월)',
          value: {
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            schoolYear: 2025,
            termName: '1학기',
            start: '2025-03-01',
            end: '2025-08-31',
            type: 'REGULAR',
            pickRule: 'RANDOM',
            allowTimeOverlap: false,
          },
        },
        fall: {
          summary: '2학기 생성',
          description: '정규 2학기 생성 (9월~2월)',
          value: {
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            schoolYear: 2025,
            termName: '2학기',
            start: '2025-09-01',
            end: '2026-02-28',
            type: 'REGULAR',
            pickRule: 'FIRST',
            allowTimeOverlap: false,
          },
        },
        special: {
          summary: '특별프로그램 생성',
          description: '특별프로그램 운영',
          value: {
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            schoolYear: 2025,
            termName: '여름특별프로그램',
            start: '2025-07-15',
            end: '2025-08-15',
            type: 'SPECIAL',
            pickRule: 'FIRST',
            allowTimeOverlap: true,
          },
        },
        withBooking: {
          summary: '수강신청 일정 포함',
          description: '수강신청 일정이 설정된 학기',
          value: {
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            schoolYear: 2025,
            termName: '1학기',
            start: '2025-03-01',
            end: '2025-08-31',
            type: 'REGULAR',
            pickRule: 'RANDOM',
            allowTimeOverlap: false,
            bookingStart: '2025-02-20T09:00:00Z',
            bookingEnd: '2025-02-25T18:00:00Z',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '학기 생성 성공',
      type: Term,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Term
//? ---------------------------------------------------------------------- ?//

export const FindTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 학기(Term) 상세 조회',
      description: `
### 📋 기능 개요
- 학기 ID로 특정 학기의 상세 정보를 조회합니다
- 연관된 수강신청 과목(offerings) 정보도 함께 제공됩니다
- 학기의 운영 현황과 수강신청 상태를 종합적으로 파악할 수 있습니다

### 🎯 포함되는 정보
- **기본 정보**: 학교명, 학사년도, 학기명, 기간
- **운영 정보**: 학기 유형, 상태
- **수강신청 정보**: 수강신청 일정, 준비 상태, 학생 확정 방식
- **설정 정보**: 시간 중복 허용 여부
- **연관 데이터**: offerings (수강신청 과목 목록), registrationNewsletter (수강신청 뉴스레터)

### 📝 URL 파라미터
- **id**: 조회할 학기의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 학기의 완전한 정보 + 연관 데이터

### 📊 응답 예시
\`\`\`json
{
  "id": 1,
  "schoolId": 1,
  "schoolName": "홍익대학교 사범대학 부속 초등학교",
  "schoolYear": 2025,
  "termName": "1학기",
  "start": "2025-03-01",
  "end": "2025-08-31",
  "status": "ONGOING",
  "pickRule": "RANDOM",
  "type": "REGULAR",
  "allowTimeOverlap": false,
  "isOfferingReady": true,
  "bookingStart": "2025-02-20T09:00:00Z",
  "bookingEnd": "2025-02-25T18:00:00Z",
  "offerings": [
    {
      "id": 1,
      "lessonId": 1,
      "lessonName": "영어회화",
      "maxStudents": 20,
      "currentStudents": 15
    }
  ],
  "registrationNewsletter": {
    "id": 1,
    "title": "2025-1학기 수강신청 안내",
    "body": "수강신청 관련 안내사항입니다.",
    "type": "REGISTRATION"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 학기 ID

### 💡 활용 예시
- 학기 관리 대시보드
- 수강신청 현황 모니터링
- 학기별 통계 및 리포트
- 수업 일정 계획 수립
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 학기의 고유 식별자',
      example: 1,
    }),
    ApiExtraModels(Term, Offering, Newsletter),
    ApiOkResponse({
      description: '학기 상세 조회 성공 - 연관 정보 포함',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Term) },
          {
            properties: {
              offerings: {
                type: 'array',
                items: { $ref: getSchemaPath(Offering) },
                description: '수강신청 과목 목록',
              },
              registrationNewsletter: {
                $ref: getSchemaPath(Newsletter),
                description:
                  '수강신청 뉴스레터 (type이 REGISTRATION인 newsletter)',
                nullable: true,
              },
            },
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Term
//? ---------------------------------------------------------------------- ?//

export const UpdateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 학기(Term) 정보 수정',
      description: `
### 📋 기능 개요
- 기존 학기의 정보를 부분적으로 수정합니다
- 수정하고자 하는 필드만 요청 데이터에 포함하면 됩니다
- 학기 운영 중에도 필요에 따라 정보 조정이 가능합니다

### 🎯 수정 가능한 필드
- **기본 정보**: 학교명(schoolName), 학사년도(schoolYear), 학기명(termName)
- **기간 정보**: 시작일(start), 종료일(end)
- **수강신청**: 수강신청 시작/종료 일시(bookingStart, bookingEnd)
- **규칙 설정**: 학생 확정 방식(pickRule), 시간 중복 허용(allowTimeOverlap)
- **학기 유형**: 정규/특별 등 유형(type)

### 🚫 수정 불가능한 필드
- **관계 외래키**: schoolId
- **자동 상태변경**: isOfferingReady
- **시스템 정보**: id, createdAt, updatedAt

### ⚠️ 주의사항
- **기간 변경**: 기존 수업 일정과 충돌하지 않는지 확인 필요
- **수강신청 일정**: bookingStart 최초 설정 시 offerings 테이블 자동 생성
- **날짜 제약**: 종료일은 항상 시작일보다 늦어야 함

### 📝 요청 예시
\`\`\`json
{
  "termName": "2025-2학기",
  "bookingStart": "2025-08-20T09:00:00Z",
  "bookingEnd": "2025-08-25T18:00:00Z"
}
\`\`\`

### ✅ 성공 응답
- **HTTP 200**: 수정 완료
- **응답 데이터**: 수정된 학기의 전체 정보

### ❌ 실패 케이스
- **400 Bad Request**: 유효하지 않은 수정 데이터
  - 종료일이 시작일보다 이른 경우
  - 잘못된 날짜/시간 형식
  - 수강신청 일정이 학기 시작 후인 경우
- **404 Not Found**: 존재하지 않는 학기 ID
- **422 Unprocessable Entity**: 비즈니스 규칙 위반
  - 진행 중인 수강신청이 있는 상태에서 기간 변경
  - 이미 배정된 학생이 있는 상태에서 규칙 변경

### 🔄 후속 작업
- offerings 테이블 업데이트 (수강신청 일정 변경 시)
- 관련 수업 일정 동기화
- 학생/학부모 알림 발송 (중요 변경사항)
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 학기의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: UpdateTermDto,
      description: '수정할 학기 정보 (수정하고자 하는 필드만 포함)',
      examples: {
        basic: {
          summary: '기본 정보 수정',
          description: '학기명과 기간 조정',
          value: {
            termName: '2025-2학기',
            start: '2025-09-01',
            end: '2026-02-28',
          },
        },
        booking: {
          summary: '수강신청 일정 설정',
          description: '수강신청 오픈 일정 추가/변경',
          value: {
            bookingStart: '2025-08-20T09:00:00Z',
            bookingEnd: '2025-08-25T18:00:00Z',
            isOfferingReady: true,
          },
        },
        rules: {
          summary: '운영 규칙 변경',
          description: '학생 배정 방식 및 시간표 설정 변경',
          value: {
            pickRule: 'FIRST',
            allowTimeOverlap: true,
            type: 'SPECIAL',
          },
        },
        comprehensive: {
          summary: '종합 정보 수정',
          description: '여러 필드를 동시에 수정',
          value: {
            termName: '2025 겨울특별프로그램',
            start: '2025-12-23',
            end: '2026-01-31',
            type: 'SPECIAL',
            pickRule: 'FIRST',
            allowTimeOverlap: true,
            bookingStart: '2025-12-01T09:00:00Z',
            bookingEnd: '2025-12-15T18:00:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '학기 정보 수정 성공',
      type: Term,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Term
//? ---------------------------------------------------------------------- ?//

export const DeleteTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 학기(Term) 삭제',
      description: `
### 📋 기능 개요
- 학기를 소프트 삭제 처리합니다
- 물리적 삭제가 아닌 deletedAt 필드에 삭제 시간을 기록하는 방식
- 관련된 모든 데이터의 무결성을 보장하면서 안전하게 삭제 처리

### 🎯 삭제 방식
- **소프트 삭제**: deletedAt 필드에 삭제 시간 기록
- **데이터 보존**: 모든 연관 데이터가 보존됨 (복구 가능)
- **연관 데이터**: offerings, groups 등도 연쇄적으로 소프트 삭제

### ⚠️ 삭제 제약사항
- **수강신청 진행**: 수강신청이 진행 중인 경우 경고 및 확인 필요
- **학생 배정**: 이미 학생이 배정된 경우 데이터 정리 후 삭제
- **권한**: 관리자만 삭제 가능

### 📝 URL 파라미터
- **id**: 삭제할 학기의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 삭제 완료
- **응답 데이터**: 삭제된 학기 정보 (deletedAt 포함)

### 📊 응답 예시
\`\`\`json
{
  "id": 1,
  "schoolId": 1,
  "schoolName": "홍익대학교 사범대학 부속 초등학교",
  "schoolYear": 2025,
  "termName": "1학기",
  "start": "2025-03-01",
  "end": "2025-08-31",
  "status": "FINISHED",
  "pickRule": "RANDOM",
  "type": "REGULAR",
  "allowTimeOverlap": false,
  "isOfferingReady": true,
  "bookingStart": "2025-02-20T09:00:00Z",
  "bookingEnd": "2025-02-25T18:00:00Z",
  "deletedAt": "2025-01-15T14:30:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T14:30:00Z"
}
\`\`\`

### ❌ 실패 케이스
- **400 Bad Request**: 삭제 불가능한 상태
  - 진행 중인 수강신청이 있는 경우
- **404 Not Found**: 존재하지 않는 학기 ID
- **422 Unprocessable Entity**: 비즈니스 규칙 위반
  - 미완료된 결제 건이 있는 경우
  - 진행 중인 수업이 있는 경우
  - 중요한 학사 일정이 남아있는 경우

### 🔄 후속 작업
- 연관된 offerings 소프트 삭제
- 관련 groups 상태 변경
- 학생/학부모 알림 발송
- 데이터 아카이브 처리
- 감사 로그 기록

### 💡 복구 방법
- 관리자 페이지에서 소프트 삭제된 학기 복구 가능
- deletedAt 필드를 null로 설정하여 복구
- 연관 데이터도 함께 복구 처리
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 학기의 고유 식별자',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학기 삭제 성공',
      type: Term,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};
