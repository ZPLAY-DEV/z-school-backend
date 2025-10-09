//? ---------------------------------------------------------------------- ?//
//? Student Swagger Documentation
//? ---------------------------------------------------------------------- ?//

import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { SchooldayWithAttendanceDto } from 'src/domain/student/dto/schoolday-with-attendance.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';

//? ---------------------------------------------------------------------- ?//
//? Create
//? ---------------------------------------------------------------------- ?//

export const CreateStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📝 학생 생성',
      description: `
### 📋 기능 설명
새로운 학생을 시스템에 등록합니다.

### 🏷️ 세 가지 생성 방식
**1. 🎯 부모 ID로 직접 연결** (가장 간단)
- \`parentId\`만 제공 (parent 객체 무시됨)
- 기존 부모의 ID를 사용하여 직접 연결

**2. 🔗 기존 부모와 연결하여 생성**
- \`parent.id\`만 제공 (다른 parent 필드들은 무시됨)
- 이미 등록된 부모와 학생 연결

**3. 🆕 미등록 부모와 함께 생성** (추천)
- \`parent.id\` 제외, \`parent.phone\` 필수
- 새로운 부모를 생성하면서 학생 등록

### 📌 비즈니스 규칙
- **필수 정보**: schoolId, grade, parent (또는 parentId)
- **부모 정보**: parent 객체는 항상 필수 (parentId 미제공시)
- **선택 정보**: class, studentCode, name, phone, status, note
- **중복 체크**: 동일 학교 내 학번 중복 불가
- **학년 범위**: 1~6학년만 가능

### ⚠️ 주의사항
- parent 객체는 항상 필수 (일관성 있는 API 구조)
- parentId가 제공되면 parent 객체는 무시됨
- 기존 부모 연결: parent.id만 제공
- 새로운 부모 생성: parent.id 제외, parent.phone 필수
- 전화번호는 하이픈 없이 숫자만 입력
- 학생 이름은 한글, 영문, 숫자, 공백만 허용
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
      examples: {
        'direct-parent-reference': {
          summary: '🎯 부모 ID로 직접 연결',
          description:
            '기존 부모의 ID를 사용하여 직접 연결하는 방식 (가장 간단한 방법)',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            status: 'ATTENDING',
            phone: '01011112222',
            escortPhone: '01022223333',
            parentId: 1,
          },
        },
        'existing-parent': {
          summary: '🔗 기존 부모와 연결하여 학생 생성',
          description:
            '이미 등록된 부모와 연결하여 학생을 등록하는 경우 (parent.id만 포함)',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            status: 'ATTENDING',
            phone: '01011112222',
            escortPhone: '01022223333',
            parent: {
              id: 1,
            },
          },
        },
        'new-parent': {
          summary: '🆕 미등록 부모와 함께 학생 생성',
          description:
            '새로운 부모를 생성하면서 학생을 등록하는 경우 (parent 객체 포함, parentId 제외)',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            status: 'ATTENDING',
            phone: '01011112222',
            escortPhone: '01022223333',
            parent: {
              phone: '01066661031',
            },
          },
        },
        'detailed-new-parent': {
          summary: '📝 상세 정보와 함께 새로운 부모 및 학생 생성',
          description: '새로운 부모의 상세 정보와 함께 학생을 등록하는 경우',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            status: 'ATTENDING',
            phone: '01011112222',
            escortPhone: '01022223333',
            nextStop: '태권도 학원',
            note: '알레르기: 견과류 주의 필요',
            parent: {
              name: '홍부모',
              phone: '01066661031',
              note: '주말에만 연락 가능',
              termsAgreedAt: '2025-01-01T12:00:00Z',
            },
          },
        },
        'minimal-new-parent': {
          summary: '🎯 최소 정보로 새로운 부모 및 학생 생성',
          description: '필수 정보만으로 새로운 부모와 학생을 생성하는 경우',
          value: {
            schoolId: 1,
            grade: 3,
            parent: {
              phone: '01066661031',
            },
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '✅ 학생 생성 성공',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '🚫 요청 데이터 오류 - 필수 필드 누락, 데이터 형식 오류, 학번 중복',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 리소스 없음 - 존재하지 않는 학교 ID 또는 학부모 ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description: '⚠️ 데이터 충돌 - 동일 학교 내 학번 중복',
    }),
  );

export const CreateStudentDryRunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 학생 생성 사전 검증',
      description: `
### 📋 기능 설명
학생 생성 전 중복 여부를 사전 검증합니다.

### 🏷️ 검증 방식
실제 생성 API와 동일한 payload 구조를 사용:
- **부모 ID 직접**: parentId만 제공
- **기존 부모**: parent.id만 제공
- **새로운 부모**: parent.id 제외, parent.phone 필수

### 🎯 검증 항목
- 동일 학교 내 학번 중복
- 동일 학교 내 동명이인 중복
- 학부모 전화번호 중복

### 📤 응답
- **중복 없음**: null 반환
- **중복 있음**: 중복되는 학생 정보 반환
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
      examples: {
        'dryrun-parent-id': {
          summary: '🎯 부모 ID로 직접 연결 검증',
          description: '기존 부모 ID를 사용한 직접 연결 방식으로 검증',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            parentId: 1,
          },
        },
        'dryrun-existing-parent': {
          summary: '🔗 기존 부모 연결 방식으로 검증',
          description: '기존 부모 연결 방식으로 검증',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            parent: {
              id: 1,
            },
          },
        },
        'dryrun-new-parent': {
          summary: '🆕 미등록 부모와 함께 생성 검증',
          description: '새로운 부모 생성 방식으로 검증',
          value: {
            schoolId: 1,
            grade: 3,
            class: '5',
            studentCode: 4,
            name: '이학상',
            parent: {
              phone: '01066661031',
            },
          },
        },
      },
    }),
    ApiOkResponse({
      description: '✅ 검증 완료',
      schema: {
        oneOf: [
          { type: 'null', description: '중복 없음 - 생성 가능' },
          {
            $ref: '#/components/schemas/Student',
            description: '중복 학생 정보',
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Read
//? ---------------------------------------------------------------------- ?//

export const GetStudentTermsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📝 학생 학기 목록 조회',
      description: `
### 📋 기능 설명
특정 학생이 속한 모든 학기 목록을 조회합니다.

### 📤 Response
학생이 수강한 모든 학기 정보 배열을 반환합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 학기 목록 조회 성공',
      type: Student,
      isArray: true,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
  );

export const GetPaginatedStudentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📄 학생 목록 조회 (페이지네이션)',
      description: `
### 📋 기능 설명
페이지네이션을 지원하는 학생 목록을 조회합니다.

### 🔍 필터링 옵션
- **grade**: 학년별 필터링 (1~6)
- **status**: 학생 상태별 필터링 (ATTENDING, TRANSFERRED 등)
- **schoolId**: 학교별 필터링

### 📊 정렬 옵션
- **기본 정렬**: ID 내림차순
- **정렬 가능 컬럼**: id, grade

### 📤 Response
페이지네이션 정보와 함께 학생 목록을 반환합니다.
      `,
    }),
    ApiQuery({
      name: 'page',
      type: Number,
      description: '페이지 번호 (1부터 시작)',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      description: '페이지당 항목 수',
      required: false,
      example: 10,
    }),
    ApiQuery({
      name: 'grade',
      type: Number,
      description: '학년 필터 (1~6)',
      required: false,
      example: 3,
    }),
    ApiQuery({
      name: 'status',
      type: String,
      description: '학생 상태 필터',
      required: false,
      example: 'ATTENDING',
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      description: '학교 ID 필터',
      required: false,
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 목록 조회 성공',
      type: Student,
    }),
  );

export const FindByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 학생 상세 조회',
      description: `
### 📋 기능 설명
학생 ID로 특정 학생의 상세 정보를 조회합니다.

### 📤 Response
학생의 모든 정보를 포함한 상세 데이터를 반환합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 상세 조회 성공',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
  );

export const GetAllSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학생 수업일 목록 조회',
      description: `
### 📋 기능 설명
특정 학생의 모든 수업일 목록을 조회합니다.

### 📤 Response
학생이 속한 모든 수업일 정보 배열을 반환합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수업일 목록 조회 성공',
      type: Schoolday,
      isArray: true,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
  );

export const GetSchooldayByDateDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 특정 날짜 학생 수업일 조회 (출석/하교 정보 포함)',
      description:
        '특정 날짜의 학생 수업일을 출석/하교 정보와 함께 조회합니다 (학부모/학생 앱용 - departure 포함). 💡 학기 전체 일정 조회는 /schools/:schoolId/terms/:termId/students/:studentId/schooldays 사용.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (필수)',
      required: true,
      example: 1,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD 형식, 필수)',
      required: true,
      example: '2025-01-15',
    }),
    ApiOkResponseTemplate({
      description: '특정 날짜 수업일 조회 완료 (출석/하교 정보 포함)',
      type: SchooldayWithAttendanceDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Update
//? ---------------------------------------------------------------------- ?//

export const UpdateStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 학생 정보 수정',
      description: `
### 📋 기능 설명
학생의 기본 정보를 수정합니다. 필요한 필드만 선택적으로 업데이트할 수 있습니다.

### 🏷️ 수정 가능한 필드들
- **기본 정보**: 학년, 반, 학번, 이름, 전화번호
- **하교장소**: nextStops (배열 - 권장)
- **상태**: 재학 상태 (ATTENDING, TRANSFERRED)
- **부모 정보**: parentId 또는 parent 객체로 부모 변경
- **비고**: 추가 정보나 특이사항

### 🏷️ 부모 연결 방식 (우선순위)
**1️⃣ parentId 우선**: 제공시 parent 객체 무시
**2️⃣ parent.id**: 기존 부모와 연결
**3️⃣ parent 객체**: 전화번호로 기존 부모 찾기 또는 새로 생성

### 📅 하교장소 정보 (nextStops)
배열 형태로 요일별 하교장소 정보를 관리:
- **place**: 하교 후 가는 장소 (필수)
- **name**: 함께 가는 사람 이름 (선택, nullable)
- **phone**: 함께 가는 사람 전화번호 (선택, nullable)

### ⚠️ 주의사항
- **schoolId는 수정 불가**: 학교 변경은 전학 프로세스를 통해서만
- **학번 중복**: 동일 학교 내에서 학번 중복 불가
- **학년 범위**: 1~6학년만 가능
- **전화번호**: 하이픈 없이 숫자만 입력
- **부분 업데이트**: 제공된 필드만 업데이트, 나머지는 기존 값 유지

### 💡 사용 예시
\`\`\`json
{
  "grade": 4,
  "class": "2",
  "studentCode": 15,
  "name": "김학생",
  "phone": "01098765432",
  "nextStops": [
    { "place": "집", "name": "엄마", "phone": "01012345678" },
    { "place": "학원", "name": null, "phone": null }
  ],
  "status": "ATTENDING",
  "note": "집중력 향상을 위해 앞자리 배치 요청"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 학생 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateStudentDto,
      examples: {
        basic_info: {
          summary: '기본 정보 수정',
          description: '학년, 반, 학번, 이름 등 기본 정보만 수정',
          value: {
            grade: 4,
            class: '2',
            studentCode: 15,
            name: '김학생',
            phone: '01098765432',
          },
        },
        nextstops_update: {
          summary: '하교장소 정보 수정',
          description: '요일별 하교장소 정보를 배열로 수정',
          value: {
            nextStops: [
              { place: '집', name: '엄마', phone: '01012345678' },
              { place: '학원', name: null, phone: null },
              { place: '도서관', name: '친구', phone: '01098765432' },
            ],
          },
        },
        parent_change: {
          summary: '부모 정보 변경',
          description: '기존 부모 ID로 변경하거나 새로운 부모 정보로 변경',
          value: {
            parentId: 5,
            // 또는
            // parent: {
            //   name: '새로운부모',
            //   phone: '01011112222'
            // }
          },
        },
        status_change: {
          summary: '재학 상태 변경',
          description: '학생의 재학 상태를 변경 (전학 등)',
          value: {
            status: 'TRANSFERRED',
            note: '다른 학교로 전학',
          },
        },
        complete_update: {
          summary: '전체 정보 수정',
          description: '모든 수정 가능한 필드를 포함한 전체 업데이트',
          value: {
            grade: 5,
            class: '3',
            studentCode: 20,
            name: '이학생',
            phone: '01055556666',
            nextStops: [
              { place: '집', name: '엄마', phone: '01012345678' },
              { place: '학원', name: '선생님', phone: '01087654321' },
            ],
            status: 'ATTENDING',
            note: '올해부터 5학년으로 진급',
            parentId: 3,
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 정보 수정 완료',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '🚫 요청 데이터 오류 - 잘못된 데이터 형식, 필수 필드 누락, 학번 중복',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description: '⚠️ 데이터 충돌 - 학번 중복, 부모 정보 중복 등',
    }),
  );

//? ---------------------------------------------------------------------- ?//
//? Delete
//? ---------------------------------------------------------------------- ?//

export const RemoveStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 학생 삭제',
      description: `
### 📋 기능 설명
학생 정보를 시스템에서 삭제합니다.

### ⚠️ 삭제 조건 확인
- **관련 데이터 체크**: 수강 이력(picks), 출석 기록, 예약 정보
- **연관 관계**: 학부모와의 연결 해제 확인
- **Soft Delete**: 논리적 삭제로 데이터 보존

### 🚫 삭제 제한 사항
- **활성 picks가 있는 경우**: 삭제 불가 (진행 중인 수업)
- **비활성 picks가 있는 경우**: forceDelete=true로 강제 삭제 가능
- 미정산 수강료가 있는 경우 삭제 불가

### 💡 대안 방안
- **forceDelete=true**: 비활성 picks를 먼저 삭제 후 학생 삭제
- **상태 변경**: 삭제 대신 'TRANSFERRED' 상태로 변경
- **비활성화**: 논리적 삭제로 데이터 보존

### ⚠️ 주의사항
- **활성 picks는 반드시 비활성화 후 삭제**
- 관련 데이터 일괄 삭제
- 법적 보존 의무 확인 필요
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 학생 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'forceDelete',
      type: Boolean,
      description: '비활성 picks를 강제로 삭제하고 학생 삭제',
      required: false,
      example: false,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 삭제 완료',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '⚠️ 삭제 불가 - picks가 존재하는 경우 (forceDelete=true 사용)',
    }),
    ApiResponse({
      status: StatusCodes.FORBIDDEN,
      description: '🔒 권한 없음 - 삭제 권한 없는 사용자',
    }),
  );
