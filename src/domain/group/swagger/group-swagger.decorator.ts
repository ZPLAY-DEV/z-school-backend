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
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { RemovalStatus } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiEnumResponseTemplate } from 'src/common/swagger/response/api-enum.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Pick } from '../../pick/entities/pick.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Group
//? ---------------------------------------------------------------------- ?//

export const CreateGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 반(그룹) 생성',
      description: `
### 📋 기능 개요
- 새로운 반(그룹)을 생성합니다
- 수업의 최소 단위로서 반을 정의하며, 같은 수업이라도 여러 반으로 나누어 운영 가능
- 강사 정보, 수업 일정, 비용 정보 등을 포함하여 완전한 반 정보를 설정

### 🎯 비즈니스 규칙
- **필수 정보**: 수업 요일(weekday), 시작 시간(start), 종료 시간(end)
- **기본 상태**: 생성 시 PENDING 상태로 설정됨
- **시간 형식**: HH:MM 형식의 24시간제 (예: 15:30)
- **수업 시간**: 종료 시간은 시작 시간보다 늦어야 함
- **정원 제한**: 1명~100명 사이로 설정 가능
- **강사 정보**: 선택사항이지만 입력 시 유효성 검증 적용

### 📝 요청 예시
\`\`\`json
{
  "groupName": "초급 영어 A반",
  "location": "201호 강의실",
  "capacity": 20,
  "allowedGrades": "1,2,3",
  "weekday": "MONDAY",
  "start": "15:00",
  "end": "15:40",
  "status": "PENDING",
  "tuition": 80000,
  "bookFee": 15000,
  "materialFee": 10000,
  "note": "초보자 대상 기초반입니다",
  "instructorName": "김선생",
  "instructorPhone": "01012345678",
  "instructorId": 1,
  "lessonId": 1
}
\`\`\`

### ✅ 성공 응답
- **HTTP 201**: 반 생성 완료
- **응답 데이터**: 생성된 반의 전체 정보 (ID 포함)

### ❌ 실패 케이스
- **400 Bad Request**: 유효하지 않은 입력 데이터
  - 잘못된 시간 형식 (HH:MM가 아닌 경우)
  - 종료 시간이 시작 시간보다 이른 경우
  - 정원이 1~100 범위를 벗어나는 경우
  - 전화번호 형식 오류 (01012345678 형식이 아닌 경우)
  - 강사명에 특수문자 포함

### 🔄 후속 작업
1. 반 생성 후 학생 배정 (Pick 생성)
2. 수업 일정 설정 (Schoolday 생성)
3. 강사 배정 및 계약 설정
      `,
    }),
    ApiBody({
      type: CreateGroupDto,
      description: '반 생성 정보',
      examples: {
        basic: {
          summary: '기본 반 생성',
          description: '최소 필수 정보만으로 반 생성',
          value: {
            weekday: 'MONDAY',
            start: '15:00',
            end: '15:40',
          },
        },
        complete: {
          summary: '완전한 반 생성',
          description: '모든 정보를 포함한 반 생성',
          value: {
            groupName: '초급 영어 A반',
            location: '201호 강의실',
            capacity: 20,
            allowedGrades: '1,2,3',
            weekday: 'MONDAY',
            start: '15:00',
            end: '15:40',
            status: 'PENDING',
            tuition: 80000,
            bookFee: 15000,
            materialFee: 10000,
            note: '초보자 대상 기초반입니다',
            instructorName: '김선생',
            instructorPhone: '01012345678',
            instructorId: 1,
            lessonId: 1,
          },
        },
        withInstructor: {
          summary: '강사 정보 포함',
          description: '새로운 강사와 함께 반 생성',
          value: {
            weekday: 'TUESDAY',
            start: '16:00',
            end: '16:40',
            instructorName: '이선생',
            instructorPhone: '01087654321',
            tuition: 90000,
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '반 생성 성공',
      type: Group,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Group
//? ---------------------------------------------------------------------- ?//

export const FindGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 반(그룹) 상세 조회',
      description: `
### 📋 기능 개요
- 반 ID로 특정 반의 상세 정보를 조회합니다
- 연관된 학생 목록(picks), 수업 일정(schooldays), 계약 정보(contracts) 포함
- 실시간 반 운영 현황을 파악할 수 있는 완전한 정보 제공

### 🎯 포함되는 정보
- **기본 정보**: 반명, 장소, 정원, 허용 학년, 수업 일정
- **비용 정보**: 수업료, 도서비, 재료비
- **강사 정보**: 강사명, 연락처, 강사 ID
- **운영 정보**: 상태, 비고, 생성/수정 일시
- **연관 데이터**: 
  - picks: 소속 학생 목록
  - schooldays: 수업 일정
  - contracts: 계약 정보 (강사 정보 포함)

### 📝 URL 파라미터
- **id**: 조회할 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 반의 완전한 정보 + 연관 데이터

### 📊 응답 예시
\`\`\`json
{
  "id": 1,
  "groupName": "초급 영어 A반",
  "location": "201호 강의실",
  "capacity": 20,
  "allowedGrades": "1,2,3",
  "weekday": "MONDAY",
  "start": "15:00",
  "end": "15:40",
  "status": "ACTIVE",
  "tuition": 80000,
  "bookFee": 15000,
  "materialFee": 10000,
  "instructorName": "김선생",
  "picks": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "name": "홍길동",
        "grade": 1
      }
    }
  ],
  "schooldays": [...],
  "contracts": [...]
}
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 반 ID

### 💡 활용 예시
- 반 관리 페이지에서 반 정보 표시
- 학생 배정 현황 확인
- 수업 일정 관리
- 강사 정보 확인
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 반의 고유 식별자',
      example: 1,
    }),
    ApiExtraModels(Group, Pick, Student),
    ApiOkResponse({
      description: '반 상세 조회 성공 - 연관 정보 포함',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Group) },
          {
            properties: {
              picks: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(Pick) },
                    {
                      properties: {
                        student: { $ref: getSchemaPath(Student) },
                      },
                    },
                  ],
                },
                description: '소속 학생 목록',
              },
              schooldays: {
                type: 'array',
                description: '수업 일정 목록',
              },
              contracts: {
                type: 'array',
                description: '계약 정보 목록 (강사 정보 포함)',
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
//? List Current Students
//? ---------------------------------------------------------------------- ?//

export const ListCurrentStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 현재 수강생 목록 조회',
      description: `
### 📋 기능 개요
- 특정 반(그룹)의 현재 수강중인 학생들의 목록을 조회합니다
- 수강 종료되지 않은 활성 상태의 학생들만 반환합니다
- 반 운영 현황 파악과 출석 관리에 활용됩니다

### 🎯 조회 조건
- **현재 수강생**: endedBy가 null인 학생들 (수강이 종료되지 않은 학생)
- **활성 학생**: 학생 상태가 ACTIVE인 경우만 포함
- **정렬**: 수강 시작일 순서 (createdAt ASC)

### 📝 URL 파라미터
- **id**: 대상 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 현재 수강생 배열 (Student)

### 📊 응답 예시
\`\`\`json
[
  {
    "id": 10,
    "name": "김철수",
    "grade": 2,
    "schoolId": 1,
    "parentId": 5,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  },
  {
    "id": 11,
    "name": "박영희",
    "grade": 3,
    "schoolId": 1,
    "parentId": 6,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  }
]
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 반 ID
- **400 Bad Request**: 잘못된 반 ID 형식 (숫자가 아님)

### 💡 활용 예시
- 반 출석부 생성
- 수강생 현황 대시보드
- 학부모 연락처 관리
- 성적 관리 시스템
- 반 정원 현황 확인

### 🔄 관련 API
- **페이지네이션 버전**: GET /groups/:id/current-students/paginated
- **상세 정보 포함**: Pick 엔티티 기반 조회로 수강 기간 등 추가 정보 확인 가능
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '대상 반의 고유 식별자',
      example: 1,
    }),
    ApiOkResponse({
      description: '현재 수강생 목록 조회 성공',
      type: [Student],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List Canceled Students
//? ---------------------------------------------------------------------- ?//

export const ListCanceledStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 수강 취소/종료된 학생 목록 조회',
      description: `
### 📋 기능 개요
- 특정 반(그룹)에서 수강을 취소하거나 종료한 학생들의 목록을 조회합니다
- 과거 수강 이력 관리와 재수강 대상자 파악에 활용됩니다
- 수강 종료 사유 분석과 학원 운영 개선에 도움이 됩니다

### 🎯 조회 조건
- **종료된 수강생**: endedBy가 null이 아닌 학생들 (수강이 종료된 학생)
- **모든 상태**: 학생의 현재 상태와 무관하게 수강 종료 이력만 확인
- **정렬**: 수강 종료일 역순 (최근 종료된 학생부터)

### 📝 URL 파라미터
- **id**: 대상 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 수강 취소/종료된 학생 배열 (Student)

### 📊 응답 예시
\`\`\`json
[
  {
    "id": 15,
    "name": "이민수",
    "grade": 1,
    "schoolId": 1,
    "parentId": 8,
    "status": "ACTIVE",
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z"
  },
  {
    "id": 16,
    "name": "최지은",
    "grade": 2,
    "schoolId": 1,
    "parentId": 9,
    "status": "WITHDRAWN",
    "createdAt": "2025-01-08T09:00:00Z",
    "updatedAt": "2025-01-18T11:20:00Z"
  }
]
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 반 ID
- **400 Bad Request**: 잘못된 반 ID 형식 (숫자가 아님)

### 💡 활용 예시
- 수강 취소 이력 분석
- 재수강 대상자 관리
- 학부모 상담 자료 준비
- 반 운영 개선 방안 도출
- 환불 처리 이력 확인

### 🔄 관련 API
- **페이지네이션 버전**: GET /groups/:id/canceled-students/paginated
- **상세 정보 포함**: Pick 엔티티 기반 조회로 종료 사유, 종료일 등 추가 정보 확인 가능

### 📈 분석 가능한 정보
- 수강 취소 패턴 분석
- 학년별 중도 탈락률
- 시기별 취소 동향
- 재수강률 추적
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '대상 반의 고유 식별자',
      example: 1,
    }),
    ApiOkResponse({
      description: '수강 취소/종료된 학생 목록 조회 성공',
      type: [Student],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List Available Students
//? ---------------------------------------------------------------------- ?//

export const ListAvailableStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 반 배정 가능한 모든 학생 목록',
      description: `
### 📋 기능 개요
- 특정 반에 배정 가능한 학생들의 목록을 조회합니다
- 동일 수업(lesson)의 모든 반에 이미 소속된 학생들은 제외됩니다
- 반의 허용 학년과 일치하는 학생만 포함하여 최적화된 목록을 제공합니다

### 🎯 필터링 조건 (서버 메모리 기반)
- **학년 제한**: 반의 allowedGrades에 해당하는 학생만 포함
  - allowedGrades는 쉼표로 구분된 문자열 (예: "1,2,3")
  - 각 학생의 grade 필드와 비교하여 일치하는 학생만 선택
- **중복 배정 방지**: 해당 수업(lesson)의 모든 반에 이미 소속된 학생 제외
  - lesson.groups의 모든 picks에서 studentId 추출
  - 이미 등록된 학생은 목록에서 제외
- **동일 학교 소속**: 해당 수업의 school에 속한 학생만 대상
  - lesson.school.students에서 학생 목록 가져오기

### ⚙️ 처리 과정
1. 대상 반의 lesson, lesson.groups, lesson.school.students 관계 로드
2. allowedGrades 파싱 (쉼표 구분 → 숫자 배열)
3. 동일 수업 내 모든 반의 picks에서 등록된 학생 ID 추출
4. 학교 소속 학생 중에서 학년 조건 만족 + 미등록 학생 필터링
5. 결과 배열 반환

### 📝 URL 파라미터
- **id**: 대상 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 배정 가능한 학생 배열

### 📊 응답 예시
\`\`\`json
[
  {
    "id": 10,
    "name": "김철수",
    "grade": 2,
    "schoolId": 1,
    "parentId": 5,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  },
  {
    "id": 11,
    "name": "박영희",
    "grade": 3,
    "schoolId": 1,
    "parentId": 6,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  }
]
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 반 ID
- **400 Bad Request**: 잘못된 반 ID 형식 (숫자가 아님)

### 💡 활용 예시
- 반 구성 시 학생 선택 드롭다운 메뉴
- 신규 학생 배정 인터페이스
- 반 정원 관리 및 학생 이동 기능
- 수업 편성 시 학생 가용성 확인

### ⚠️ 주의사항
- 동일 수업 내 다른 반에 이미 등록된 학생은 표시되지 않음
- 학년 정보가 반의 allowedGrades와 정확히 일치하는 학생만 포함
- 결과는 메모리 기반 필터링으로 실시간 처리됨
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '대상 반의 고유 식별자',
      example: 1,
    }),
    ApiOkResponse({
      description: '배정 가능한 학생 목록 조회 성공',
      type: [Student],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List Booked Students
//? ---------------------------------------------------------------------- ?//

export const ListBookedPendingStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 반 배정 가능한 모든 예약대기 학생 목록',
      description: `
### 📋 기능 개요
- 해당 반과 동일한 허용 학년을 가진 모든 수강신청(offering)에서 PENDING 상태로 예약한 학생 목록을 조회합니다
- 대기 순번(waitingPosition) 순서대로 정렬된 대기열을 반환합니다
- 수강신청 확정 시 우선순위 참고용으로 활용됩니다

### 🔄 비즈니스 로직
1. **반 정보 조회**: 대상 반의 allowedGrades와 lessonId를 확인합니다
2. **허용 학년 파싱**: allowedGrades를 쉼표로 구분하여 숫자 배열로 변환합니다 (예: "1,2,3" → [1,2,3])
3. **관련 수강신청 검색**: 동일한 수업(lesson)에 속하면서 allowedGrades가 정확히 일치하는 모든 offerings를 검색합니다
4. **예약 대기 학생 조회**: 해당 offerings의 PENDING 상태 booking들을 waitingPosition 오름차순으로 조회합니다
5. **학생 정보 추출**: booking에 연결된 student 정보를 BookedStudentDto 형태로 변환하여 반환합니다

### ⚠️ 중요 제약사항
- **간접 관계**: group과 offering 간 직접 관계가 없으므로 lesson을 통한 간접 연결을 활용합니다
- **정확한 학년 일치**: allowedGrades가 정확히 일치하는 offerings만 대상으로 합니다 (순서 무관하지만 값은 동일)
- **PENDING 상태만**: PENDING 상태의 booking만 조회하며, CONFIRMED나 CANCELED는 제외됩니다
- **대기 순번 필수**: waitingPosition이 null인 경우는 제외됩니다

### 📝 URL 파라미터
- **id**: 대상 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 조회 성공
- **응답 데이터**: 예약 대기 학생 배열 (BookedStudentDto)

### 📊 응답 예시
\`\`\`json
[
  {
    "id": 123,
    "name": "홍길동",
    "grade": 2,
    "schoolId": 1,
    "parentId": 45,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z",
    "waitingPosition": 1,
    "bookingStatus": "PENDING"
  },
  {
    "id": 124,
    "name": "김영희",
    "grade": 3,
    "schoolId": 1,
    "parentId": 46,
    "status": "ACTIVE",
    "createdAt": "2025-01-16T10:30:00Z",
    "updatedAt": "2025-01-16T10:30:00Z",
    "waitingPosition": 2,
    "bookingStatus": "PENDING"
  }
]
\`\`\`

### ❌ 실패 케이스
- **404 Not Found**: 존재하지 않는 반 ID
- **400 Bad Request**: 잘못된 반 ID 형식 (숫자가 아님)

### 💡 활용 예시
- 수강신청 확정 시 대기 순서 참고
- 추가 반 개설 필요성 판단 기준
- 대기 학생 현황 모니터링
- 학부모 대기 순번 안내

### 📚 시나리오 예시
- **1,2,3학년 대상 수학 반**: 동일 허용 학년의 수학 수강신청 대기열 확인
- **반 정원 초과 시**: 대기 순번에 따른 우선순위 처리
- **추가 반 개설 검토**: 대기 학생 수를 바탕으로 신규 반 개설 여부 결정
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '대상 반의 고유 식별자',
      example: 1,
    }),
    ApiOkResponse({
      description: '예약 대기 학생 목록 조회 성공',
      type: [BookedStudentDto],
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 123, description: '학생 ID' },
            name: {
              type: 'string',
              example: '홍길동',
              description: '학생 이름',
            },
            grade: { type: 'number', example: 2, description: '학년' },
            schoolId: { type: 'number', example: 1, description: '학교 ID' },
            parentId: { type: 'number', example: 45, description: '학부모 ID' },
            status: {
              type: 'string',
              example: 'ACTIVE',
              description: '학생 상태',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성일시',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정일시',
            },
            waitingPosition: {
              type: 'number',
              example: 1,
              description: '대기 순번',
            },
            bookingStatus: {
              type: 'string',
              example: 'PENDING',
              description: '예약 상태',
            },
          },
        },
        example: [
          {
            id: 123,
            name: '홍길동',
            grade: 2,
            schoolId: 1,
            parentId: 45,
            status: 'ACTIVE',
            createdAt: '2025-01-15T09:00:00Z',
            updatedAt: '2025-01-15T09:00:00Z',
            waitingPosition: 1,
            bookingStatus: 'PENDING',
          },
          {
            id: 124,
            name: '김영희',
            grade: 3,
            schoolId: 1,
            parentId: 46,
            status: 'ACTIVE',
            createdAt: '2025-01-16T10:30:00Z',
            updatedAt: '2025-01-16T10:30:00Z',
            waitingPosition: 2,
            bookingStatus: 'PENDING',
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Group
//? ---------------------------------------------------------------------- ?//

export const UpdateGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 반(그룹) 정보 수정',
      description: `
### 📋 기능 개요
- 기존 반의 정보를 부분적으로 수정합니다
- 수정하고자 하는 필드만 요청 데이터에 포함하면 됩니다
- 연관 관계 변경 없이 반 자체의 속성만 수정 가능

### 🎯 수정 가능한 필드
- **기본 정보**: 반명(groupName), 장소(location), 정원(capacity)
- **수업 정보**: 허용학년(allowedGrades), 요일(weekday), 시간(start, end)
- **상태 정보**: 운영상태(status), 비고(note)
- **비용 정보**: 수업료(tuition), 도서비(bookFee), 재료비(materialFee)
- **강사 정보**: 강사명(instructorName), 연락처(instructorPhone)

### 🚫 수정 불가능한 필드
- **연관 관계**: instructorId, lessonId (별도 API 사용)
- **시스템 정보**: id, createdAt, updatedAt

### ⚠️ 주의사항
- **수업 시간 변경**: 기존 수업 일정과 충돌하지 않는지 확인 필요
- **정원 감소**: 현재 소속 학생 수보다 적게 설정할 수 없음
- **상태 변경**: ACTIVE → CANCELED 시 학생들에게 알림 발송
- **강사 정보**: 기존 계약에 영향을 줄 수 있음

### 📝 요청 예시
\`\`\`json
{
  "groupName": "심화 영어 A반",
  "capacity": 25,
  "tuition": 90000,
  "note": "중급자 대상으로 변경"
}
\`\`\`

### ✅ 성공 응답
- **HTTP 200**: 수정 완료
- **응답 데이터**: 수정된 반의 전체 정보

### ❌ 실패 케이스
- **400 Bad Request**: 유효하지 않은 수정 데이터
  - 현재 학생 수보다 적은 정원 설정
  - 잘못된 시간 형식
  - 종료 시간이 시작 시간보다 이른 경우
- **404 Not Found**: 존재하지 않는 반 ID
- **422 Unprocessable Entity**: 비즈니스 규칙 위반
  - 수업 시간 충돌
  - 정원 초과 상황에서 정원 감소 시도

### 🔄 후속 작업
- 관련 수업 일정 업데이트
- 학생/학부모 알림 발송 (중요 변경사항)
- 강사 계약 정보 동기화
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 반의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: UpdateGroupDto,
      description: '수정할 반 정보 (수정하고자 하는 필드만 포함)',
      examples: {
        basic: {
          summary: '기본 정보 수정',
          description: '반명과 정원만 수정',
          value: {
            groupName: '심화 영어 A반',
            capacity: 25,
          },
        },
        schedule: {
          summary: '수업 일정 수정',
          description: '수업 시간과 요일 변경',
          value: {
            weekday: 'TUESDAY',
            start: '16:00',
            end: '16:40',
            note: '시간 변경으로 인한 공지',
          },
        },
        fees: {
          summary: '비용 정보 수정',
          description: '수업료와 부대비용 조정',
          value: {
            tuition: 90000,
            bookFee: 20000,
            materialFee: 15000,
          },
        },
        instructor: {
          summary: '강사 정보 수정',
          description: '담당 강사 변경',
          value: {
            instructorName: '이선생',
            instructorPhone: '01087654321',
          },
        },
        status: {
          summary: '상태 변경',
          description: '반 운영 상태 변경',
          value: {
            status: 'ACTIVE',
            note: '정식 개강 완료',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '반 정보 수정 성공',
      type: Group,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Restore Group
//? ---------------------------------------------------------------------- ?//

export const RestoreGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 폐강된 반 복구',
      description: `
### 📋 기능 개요
- 폐강(CANCELED) 상태의 반을 다시 활성(ACTIVE) 상태로 복구합니다
- 반의 모든 기존 정보가 그대로 유지되며, 상태만 변경됩니다
- 복구 후 즉시 운영 재개 가능

### 🎯 복구 조건
- **대상 상태**: CANCELED 상태의 반만 복구 가능
- **데이터 무결성**: 연관된 학생, 강사 정보가 유효해야 함
- **권한**: 관리자 또는 해당 강사만 복구 가능

### ⚠️ 복구 전 확인사항
- **강사 상태**: 담당 강사가 여전히 활성 상태인지 확인
- **시간 충돌**: 다른 반과 시간 충돌이 없는지 확인
- **학생 상태**: 기존 소속 학생들의 현재 상태 확인
- **시설 사용**: 지정된 장소의 사용 가능 여부 확인

### 📝 URL 파라미터
- **id**: 복구할 반의 고유 식별자 (숫자)

### ✅ 성공 응답
- **HTTP 200**: 복구 완료
- **응답 데이터**: 복구된 반의 전체 정보 (상태: ACTIVE)

### ❌ 실패 케이스
- **400 Bad Request**: 복구 불가능한 상태
  - 이미 ACTIVE 상태인 반
  - DELETED 상태의 반 (복구 불가)
- **404 Not Found**: 존재하지 않는 반 ID
- **422 Unprocessable Entity**: 비즈니스 규칙 위반
  - 강사가 비활성 상태
  - 시간 충돌 발생
  - 장소 사용 불가

### �� 후속 작업
- 소속 학생들에게 복구 알림 발송
- 수업 일정 재등록
- 강사 스케줄 업데이트
- 관련 시스템 동기화
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '복구할 반의 고유 식별자',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '반 복구 성공',
      type: Group,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Group
//? ---------------------------------------------------------------------- ?//

export const DeleteGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 반(그룹) 삭제',
      description: `
### 📋 기능 개요
- 반을 삭제하거나 폐강 처리합니다
- 반의 현재 상태에 따라 삭제 방식이 달라집니다
- 삭제 사유를 반드시 기록해야 하며, 작업자 정보가 자동으로 기록됩니다

### 🎯 삭제 방식 (상태별)
1. **PENDING 상태**
   - **물리적 삭제**: 데이터베이스에서 완전 제거
   - **조건**: 소속 학생이 없어야 함
   - **결과**: RemovalStatus.DELETED

2. **ACTIVE 상태**
   - **폐강 처리**: 상태를 CANCELED로 변경
   - **데이터 보존**: 모든 데이터가 유지됨
   - **결과**: RemovalStatus.CANCELED

3. **CANCELED 상태**
   - **소프트 삭제**: deletedAt 필드에 삭제 시간 기록
   - **조건**: 소속 학생이 없어야 함
   - **결과**: RemovalStatus.SOFT_DELETED

### ⚠️ 삭제 제약사항
- **학생 연결**: 소속 학생이 있는 경우 물리적/소프트 삭제 불가
- **관련 데이터**: 수업 기록, 출석 데이터 등이 있는 경우 고려 필요
- **권한**: 관리자 또는 담당 강사만 삭제 가능

### 📝 요청 데이터
- **note**: 삭제 사유 (필수, 최대 500자)
- **role**: 작업자 역할 (자동 설정, 수동 지정 가능)

### 📝 요청 예시
\`\`\`json
{
  "note": "수강생 부족으로 인한 폐강 처리"
}
\`\`\`

### ✅ 성공 응답
- **HTTP 200**: 삭제/폐강 완료
- **응답 데이터**: RemovalStatus (DELETED, CANCELED, SOFT_DELETED)

### 📊 응답 예시
\`\`\`json
"CANCELED"
\`\`\`

### ❌ 실패 케이스
- **400 Bad Request**: 유효하지 않은 요청
  - 삭제 사유 누락
  - 사유가 너무 긴 경우 (500자 초과)
- **404 Not Found**: 존재하지 않는 반 ID
- **422 Unprocessable Entity**: 삭제 불가능한 상황
  - 소속 학생이 있는 상태에서 물리적 삭제 시도
  - 진행 중인 수업이 있는 경우
  - 결제/계약 관련 미처리 건이 있는 경우

### 🔄 후속 작업
- 소속 학생들에게 폐강 알림 발송
- 강사 스케줄에서 제거
- 관련 수업 일정 취소
- 환불 처리 (필요 시)
- 감사 로그 기록
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 반의 고유 식별자',
      example: 1,
    }),
    ApiBody({
      type: DeleteGroupDto,
      description: '삭제 사유 및 작업자 정보',
      examples: {
        shortage: {
          summary: '수강생 부족',
          description: '최소 인원 미달로 인한 폐강',
          value: {
            note: '최소 수강 인원(5명) 미달로 인한 폐강 처리',
          },
        },
        instructor: {
          summary: '강사 사정',
          description: '강사 개인 사정으로 인한 폐강',
          value: {
            note: '담당 강사의 개인 사정으로 인한 긴급 폐강',
          },
        },
        facility: {
          summary: '시설 문제',
          description: '강의실 사용 불가로 인한 폐강',
          value: {
            note: '강의실 시설 보수로 인한 임시 폐강 (추후 재개강 예정)',
          },
        },
        administrative: {
          summary: '행정적 사유',
          description: '학교 정책 변경으로 인한 폐강',
          value: {
            note: '학교 커리큘럼 변경에 따른 해당 과목 폐강',
          },
        },
      },
    }),
    ApiEnumResponseTemplate({
      description: '삭제/폐강 처리 결과',
      type: RemovalStatus,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List Current Students Paginated
//? ---------------------------------------------------------------------- ?//

export const ListCurrentStudentsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥📄 현재 수강생 목록 페이지네이션 조회',
      description: `
### 📋 기능 개요
- 특정 반(그룹)의 현재 수강중인 학생들을 페이지네이션으로 조회합니다
- Pick 엔티티를 통해 학생 정보와 수강 상세 정보를 함께 제공합니다
- 검색, 정렬, 필터링 기능을 지원합니다

### 🎯 비즈니스 규칙
- **현재 수강생**: endedBy가 null인 학생들 (수강 종료되지 않은 학생)
- **관계 포함**: 학생 정보 + 학부모 정보 포함
- **정렬 기본값**: 수강 시작일 순 (createdAt ASC)

### 🔍 검색 & 필터링
- **검색**: note 필드에서 키워드 검색
- **정렬**: id, createdAt 기준 정렬 가능
- **필터**: startedBy, endedBy 액터별 필터링

### 📊 응답 데이터 구조
- Pick 정보 (수강 기간, 비용, 등록자 등)
- Student 정보 (학생 기본 정보)
- Parent 정보 (학부모 연락처 등)
      `,
    }),
    ApiPaginationQuery({
      sortableColumns: ['id', 'createdAt'],
      searchableColumns: ['note'],
      defaultSortBy: [['createdAt', 'ASC']],
      filterableColumns: {
        startedBy: [FilterOperator.EQ],
        endedBy: [FilterOperator.EQ],
      },
      relations: {
        student: {
          parent: true,
        },
      },
    }),
    ApiOkPaginatedResponse(Pick, {
      sortableColumns: ['id', 'createdAt'],
      searchableColumns: ['note'],
      defaultSortBy: [['createdAt', 'ASC']],
      filterableColumns: {
        startedBy: [FilterOperator.EQ],
        endedBy: [FilterOperator.EQ],
      },
      relations: {
        student: {
          parent: true,
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? List Canceled Students Paginated
//? ---------------------------------------------------------------------- ?//

export const ListCanceledStudentsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥📄 수강 취소/종료된 학생 목록 페이지네이션 조회',
      description: `
### 📋 기능 개요
- 특정 반(그룹)에서 수강을 취소하거나 종료한 학생들을 페이지네이션으로 조회합니다
- Pick 엔티티를 통해 학생 정보와 수강 상세 정보를 함께 제공합니다
- 수강 종료 사유 및 처리자 정보 확인 가능

### 🎯 비즈니스 규칙
- **취소/종료된 학생**: endedBy가 null이 아닌 학생들 (수강이 종료된 학생)
- **관계 포함**: 학생 정보 + 학부모 정보 포함
- **정렬 기본값**: 수강 종료일 역순 (end DESC)

### 🔍 검색 & 필터링
- **검색**: note 필드에서 키워드 검색 (종료 사유 등)
- **정렬**: id, createdAt, end 기준 정렬 가능
- **필터**: startedBy, endedBy 액터별 필터링

### 📊 응답 데이터 구조
- Pick 정보 (수강 기간, 종료일, 종료자 등)
- Student 정보 (학생 기본 정보)
- Parent 정보 (학부모 연락처 등)

### 📚 활용 시나리오
- 수강 취소 이력 관리
- 재수강 대상자 파악
- 수강 종료 사유 분석
      `,
    }),
    ApiPaginationQuery({
      sortableColumns: ['id', 'createdAt', 'end'],
      searchableColumns: ['note'],
      defaultSortBy: [['end', 'DESC']],
      filterableColumns: {
        startedBy: [FilterOperator.EQ],
        endedBy: [FilterOperator.EQ],
      },
      relations: {
        student: {
          parent: true,
        },
      },
    }),
    ApiOkPaginatedResponse(Pick, {
      sortableColumns: ['id', 'createdAt', 'end'],
      searchableColumns: ['note'],
      defaultSortBy: [['end', 'DESC']],
      filterableColumns: {
        startedBy: [FilterOperator.EQ],
        endedBy: [FilterOperator.EQ],
      },
      relations: {
        student: {
          parent: true,
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
