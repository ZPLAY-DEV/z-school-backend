import { applyDecorators } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
    ApiOkPaginatedResponse,
    ApiPaginationQuery,
    FilterOperator,
    PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { ResponseSchoolTermStudentBookingsDto } from '../dto/response-school-term-student-bookings.dto';

// Group 페이지네이션 설정
const GROUP_CONFIG: PaginateConfig<Group> = {
  sortableColumns: ['id', 'groupName'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    groupName: [FilterOperator.ILIKE],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Get School Term Students List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학기별 등록 학생 목록 조회',
      description: `
### 📝 기능 설명
특정 학교의 특정 학기에 등록된 모든 학생 목록을 조회합니다.

### 🔄 비즈니스 로직
- 해당 학기에 수강신청을 통해 등록된 학생들의 목록을 조회
- 학생 기본 정보(이름, 학년, 반, 연락처 등) 제공
- 수강신청 상태와 관계없이 해당 학기에 등록된 모든 학생 포함
- 학생명 기준으로 정렬하여 제공

### 💡 사용 시점
- 학기별 학생 현황 파악
- 출석부 생성
- 학급 관리 시스템
- 학부모 연락처 관리

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "parentId": 1,
    "schoolId": 1,
    "grade": 3,
    "class": "1반",
    "studentCode": 10,
    "name": "김학생",
    "phone": "01012345678",
    "escortPhone": "01087654321",
    "nextStop": "태권도 학원",
    "status": "ATTENDING",
    "note": "알레르기 주의",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "parentId": 2,
    "schoolId": 1,
    "grade": 2,
    "class": "2반",
    "studentCode": 5,
    "name": "이학생",
    "phone": "01098765432",
    "escortPhone": "01055443322",
    "nextStop": "집",
    "status": "ATTENDING",
    "note": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      example: 456,
    }),
    ApiOkResponseTemplate({
      description: '학기별 등록 학생 목록 조회 완료',
      type: Student,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Bookings
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentBookingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📋 학생 수강신청 목록 조회',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생의 수강신청 목록을 조회합니다.

### 🔄 비즈니스 로직
- 해당 학교, 학기에서 학생이 신청한 모든 수강신청 목록 조회
- **요일별로 그룹화**: offering의 lesson.groups의 weekday 정보를 기반으로 요일별로 분류
- **중복 허용**: 같은 offering이 여러 요일에 있으면 각 요일별로 별도 booking으로 표시
- **순차 정렬**: 월요일부터 토요일까지 순차적으로 정렬
- 수강신청 상태(대기, 확정, 취소 등) 포함
- 수강신청 일시 및 상세 정보 제공
- **항상 offering 정보 포함**: 각 booking에는 연관된 Offering 엔티티가 항상 포함됩니다

### 📊 응답 데이터 구조
- Booking[]: 수강신청 목록 배열 (요일별로 정렬됨)
- booking.weekday: 수업 요일 (월, 화, 수, 목, 금, 토)
- booking.offering: 각 수강신청에 연관된 Offering 엔티티 (필수 포함)
- offering.schoolId, offering.termId: 해당 학교 및 학기 정보
- offering.lesson.groups: 수업 그룹 정보 (weekday 포함)

### 💡 사용 시점
- 학생 수강 이력 조회
- 학부모 수강신청 현황 확인
- 수업료 정산 및 환불 처리
- 학기별 수강 현황 분석

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "offeringId": 456,
    "studentId": 123,
    "lessonName": "수학",
    "weekday": "월",
    "waitingPosition": 0,
    "status": "CONFIRMED",
    "note": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "offering": {
      "id": 456,
      "schoolId": 1,
      "termId": 1,
      "title": "수학 기초반",
      "description": "기초 수학 과정",
      "capacity": 20,
      "price": 150000,
      "lesson": {
        "groups": [
          {
            "weekday": "월",
            "start": "14:00",
            "end": "15:00"
          }
        ]
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  {
    "id": 1,
    "offeringId": 456,
    "studentId": 123,
    "lessonName": "수학",
    "weekday": "수",
    "waitingPosition": 0,
    "status": "CONFIRMED",
    "note": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "offering": {
      "id": 456,
      "schoolId": 1,
      "termId": 1,
      "title": "수학 기초반",
      "description": "기초 수학 과정",
      "capacity": 20,
      "price": 150000,
      "lesson": {
        "groups": [
          {
            "weekday": "수",
            "start": "14:00",
            "end": "15:00"
          }
        ]
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
]
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수강신청 목록 (요일별로 그룹화됨)',
      type: ResponseSchoolTermStudentBookingsDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Booking Stats
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentBookingStatsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📊 학생 수강신청 내용 (weekly)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생의 수강신청을 요일별로 분류하여 리턴합니다.

### 🔄 비즈니스 로직
- 학생의 모든 수강신청을 요일별로 분류
- 각 요일에 해당하는 Offering 목록 제공
- MON, TUE, WED, THU, FRI, SAT 요일별 구분
- 중복 제거 처리 (같은 Offering이 여러 시간에 있을 경우)

### 💡 사용 시점
- 학생 시간표 작성
- 수강 시간 중복 확인
- 학부모 스케줄 관리
- 요일별 수강 현황 분석

### 📝 정확한 응답 예시
\`\`\`json
{
  "MON": [
    {
      "id": 1,
      "schoolId": 1,
      "termId": 1,
      "lessonId": 1,
      "schoolName": "ABC 초등학교",
      "lessonName": "수학",
      "groupName": "수학A반",
      "capacity": 20,
      "bookingCount": 15,
      "prepicked": 0,
      "allowedGrades": [1, 2, 3],
      "pickRule": "FIRST",
      "times": [
        {
          "weekday": "월",
          "startTime": "14:00",
          "endTime": "15:00"
        }
      ],
      "bitmasks": [1],
      "groupIds": [1],
      "prepickedStudentIds": [],
      "lastSyncTimestamp": 0,
      "status": "CONFIRMED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "TUE": [],
  "WED": [
    {
      "id": 2,
      "schoolId": 1,
      "termId": 1,
      "lessonId": 2,
      "schoolName": "ABC 초등학교",
      "lessonName": "영어",
      "groupName": "영어B반",
      "capacity": 15,
      "bookingCount": 12,
      "prepicked": 0,
      "allowedGrades": [2, 3],
      "pickRule": "FIRST",
      "times": [
        {
          "weekday": "수",
          "startTime": "15:00",
          "endTime": "16:00"
        }
      ],
      "bitmasks": [4],
      "groupIds": [2],
      "prepickedStudentIds": [],
      "lastSyncTimestamp": 0,
      "status": "CONFIRMED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "THU": [],
  "FRI": [],
  "SAT": []
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '✅ 학생 수강신청 요일별 통계',
      schema: {
        type: 'object',
        properties: {
          MON: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '월요일 수강 Offering 목록',
          },
          TUE: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '화요일 수강 Offering 목록',
          },
          WED: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '수요일 수강 Offering 목록',
          },
          THU: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '목요일 수강 Offering 목록',
          },
          FRI: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '금요일 수강 Offering 목록',
          },
          SAT: {
            type: 'array',
            items: { $ref: '#/components/schemas/Offering' },
            description: '토요일 수강 Offering 목록',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학생 수업일 조회 (all)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생의 수업일 목록을 조회합니다.

### 🔄 비즈니스 로직
- 학생이 수강중인 반의 모든 수업일 조회
- 해당 학기에 진행되는 수업일만 포함
- **필수 Group 관계 포함**: 각 schoolday에는 연관된 Group 엔티티가 반드시 포함됩니다
- 시작 시간 기준으로 자동 정렬하여 시간순으로 제공
- 중복 제거 처리 (동일한 schoolday는 한 번만 포함)

### 📊 응답 데이터 구조
- **Schoolday[]: 수업일 목록 배열**
- **schoolday.group**: 각 수업일에 연관된 Group 엔티티 (필수 포함)
  - 반 이름, 강사 이름, 수업 장소, 정원, 수업료 등 상세 정보
  - 수업 시간(start, end), 요일(weekday) 정보
- **시간순 정렬**: startsAt 기준 오름차순 정렬

### 💡 사용 시점
- 학생 출석 현황 조회
- 학부모 앱에서 자녀 수업 일정 확인
- 수업료 정산 근거 자료
- 보강 수업 스케줄 관리
- 반별 수업 정보와 함께 수업일 확인

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "schoolId": 1,
    "termId": 1,
    "lessonId": 1,
    "groupId": 1,
    "name": "수학",
    "startsAt": "2024-05-27T08:00:00+09:00",
    "endsAt": "2024-05-27T09:00:00+09:00",
    "duration": 60,
    "updatedBy": null,
    "note": null,
    "startNotifiedAt": null,
    "endNotifiedAt": null,
    "group": {
      "id": 1,
      "samId": 123,
      "lessonId": 1,
      "groupName": "수학A반",
      "samName": "김선생",
      "location": "1-1교실",
      "capacity": 20,
      "allowedGrades": "1,2,3",
      "weekday": "MONDAY",
      "start": "08:00",
      "end": "09:00",
      "status": "CONFIRMED",
      "tuition": 120000,
      "bookFee": 5000,
      "materialFee": 3000,
      "days": 18,
      "deletedBy": null,
      "note": "기초 수학 과정",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  {
    "id": 2,
    "schoolId": 1,
    "termId": 1,
    "lessonId": 2,
    "groupId": 2,
    "name": "영어",
    "startsAt": "2024-05-29T15:00:00+09:00",
    "endsAt": "2024-05-29T16:00:00+09:00",
    "duration": 60,
    "updatedBy": "MANAGER",
    "note": "보강 수업",
    "startNotifiedAt": "2024-05-29T14:50:00+09:00",
    "endNotifiedAt": "2024-05-29T16:00:00+09:00",
    "group": {
      "id": 2,
      "samId": 456,
      "lessonId": 2,
      "groupName": "영어B반",
      "samName": "이선생",
      "location": "어학실",
      "capacity": 15,
      "allowedGrades": "2,3",
      "weekday": "WEDNESDAY",
      "start": "15:00",
      "end": "16:00",
      "status": "CONFIRMED",
      "tuition": 100000,
      "bookFee": 8000,
      "materialFee": 2000,
      "days": 16,
      "deletedBy": null,
      "note": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
]
\`\`\`

### 🔍 API 호출 예시
\`\`\`
GET /schools/1/terms/1/students/123/schooldays
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수업일 목록 (Group 정보 포함)',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Groups
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생이 수강중인 반 목록을 조회합니다.

### 🔄 비즈니스 로직
- 해당 학기에 학생이 수강중인 모든 반 조회
- 수강 취소되지 않은 활성 상태의 반만 포함
- 반별 상세 정보 및 수강 상태 제공

### 💡 사용 시점
- 학생 수강 현황 조회
- 반 이동 및 변경 처리
- 출석 관리 시스템
- 학부모 수강 현황 확인

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "samId": null,
    "lessonId": 1,
    "groupName": "수학A반",
    "location": "1-1교실",
    "capacity": 20,
    "allowedGrades": "1,2,3",
    "weekday": "MONDAY",
    "start": "14:40",
    "end": "15:20",
    "status": "CONFIRMED",
    "tuition": 100000,
    "bookFee": 5000,
    "materialFee": 3000,
    "days": 18,
    "deletedBy": null,
    "note": "기초 수학 과정",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "samId": 1,
    "lessonId": 2,
    "groupName": "영어B반",
    "location": "어학실",
    "capacity": 15,
    "allowedGrades": "2,3",
    "weekday": "WEDNESDAY",
    "start": "15:00",
    "end": "16:00",
    "status": "CONFIRMED",
    "tuition": 120000,
    "bookFee": 8000,
    "materialFee": 2000,
    "days": 16,
    "deletedBy": null,
    "note": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 소속 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Groups Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회 (페이지네이션)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생이 수강중인 반 목록을 페이지네이션으로 조회합니다.

### 🔍 검색 및 필터링
- **검색 가능**: groupName (그룹명)
- **정렬 가능**: id, groupName
- **필터링**: groupName (부분 일치)

### 💡 사용 시점
- 대량의 그룹 데이터 조회
- 무한 스크롤 구현
- 검색 기능이 필요한 경우
- 관리자 대시보드

### 📝 정확한 응답 예시
\`\`\`json
{
  "data": [
    {
      "id": 1,
      "samId": null,
      "lessonId": 1,
      "groupName": "수학A반",
      "location": "1-1교실",
      "capacity": 20,
      "allowedGrades": "1,2,3",
      "weekday": "MONDAY",
      "start": "14:40",
      "end": "15:20",
      "status": "CONFIRMED",
      "tuition": 100000,
      "bookFee": 5000,
      "materialFee": 3000,
      "days": 18,
      "deletedBy": null,
      "note": "기초 수학 과정",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "itemsPerPage": 10,
    "totalItems": 1,
    "currentPage": 1,
    "totalPages": 1,
    "sortBy": [["id", "DESC"]],
    "searchBy": [],
    "search": "",
    "filter": {}
  },
  "links": {
    "first": "/schools/1/terms/1/students/1/groups/paginated?limit=10",
    "previous": "",
    "current": "/schools/1/terms/1/students/1/groups/paginated?page=1&limit=10",
    "next": "",
    "last": "/schools/1/terms/1/students/1/groups/paginated?page=1&limit=10"
  }
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Canceled Groups
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentCanceledGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생이 수강 취소한 반 목록을 조회합니다.

### 🔄 비즈니스 로직
- 해당 학기에 학생이 수강 취소한 모든 반 조회
- 취소 일시 및 취소 사유 포함
- 환불 처리 상태 정보 제공

### 💡 사용 시점
- 수강료 환불 처리
- 대체 수업 안내
- 수강 이력 관리
- 취소 현황 분석

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 3,
    "samId": null,
    "lessonId": 3,
    "groupName": "체육C반",
    "location": "체육관",
    "capacity": 25,
    "allowedGrades": "1,2,3,4",
    "weekday": "FRIDAY",
    "start": "16:00",
    "end": "17:00",
    "status": "CANCELLED",
    "tuition": 80000,
    "bookFee": 0,
    "materialFee": 10000,
    "days": 15,
    "deletedBy": "PARENT",
    "note": "개인 사정으로 취소",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
]
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 취소 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Canceled Groups Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentCanceledGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회 (페이지네이션)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생 수강 취소한 반 목록을 페이지네이션으로 조회합니다.

### 🔍 검색 및 필터링
- **검색 가능**: groupName (그룹명)
- **정렬 가능**: id, groupName
- **필터링**: groupName (부분 일치)

### 💡 사용 시점
- 대량의 취소 그룹 데이터 조회
- 환불 처리 현황 관리
- 통계 및 분석 자료
- 취소 패턴 분석

### 📝 정확한 응답 예시
\`\`\`json
{
  "data": [
    {
      "id": 3,
      "samId": null,
      "lessonId": 3,
      "groupName": "체육C반",
      "location": "체육관",
      "capacity": 25,
      "allowedGrades": "1,2,3,4",
      "weekday": "FRIDAY",
      "start": "16:00",
      "end": "17:00",
      "status": "CANCELLED",
      "tuition": 80000,
      "bookFee": 0,
      "materialFee": 10000,
      "days": 15,
      "deletedBy": "PARENT",
      "note": "개인 사정으로 취소",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "meta": {
    "itemsPerPage": 10,
    "totalItems": 1,
    "currentPage": 1,
    "totalPages": 1,
    "sortBy": [["id", "DESC"]],
    "searchBy": [],
    "search": "",
    "filter": {}
  },
  "links": {
    "first": "/schools/1/terms/1/students/1/canceled-groups/paginated?limit=10",
    "previous": "",
    "current": "/schools/1/terms/1/students/1/canceled-groups/paginated?page=1&limit=10",
    "next": "",
    "last": "/schools/1/terms/1/students/1/canceled-groups/paginated?page=1&limit=10"
  }
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Student Weekly Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentWeeklySchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 학생 주간 수업일 조회 (요일별)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 학생의 주간 수업일을 요일별로 분류하여 조회합니다.

### 🔄 비즈니스 로직
- 지정된 날짜가 속한 주의 일요일부터 토요일까지 수업일 조회
- 학생이 수강중인 모든 반의 수업일을 요일별로 그룹화
- **항상 group 관계 포함**: 각 schoolday에는 연관된 Group 엔티티가 필수 포함
- 각 요일별로 시작 시간 순으로 자동 정렬
- 한국 시간대(KST) 기준으로 정확한 날짜 계산

### 📅 날짜 처리 로직
- **date 파라미터가 없는 경우**: 오늘 날짜 기준으로 해당 주 계산
- **date 파라미터가 있는 경우**: 'yyyy-MM-dd' 형식의 날짜 기준으로 해당 주 계산
- **주 범위**: 일요일(SUN) 시작 ~ 토요일(SAT) 종료
- **시간대**: Asia/Seoul (UTC+09:00) 기준으로 정확한 주 계산

### 📊 응답 데이터 구조
- **SUN~SAT**: 각 요일별 Schoolday 배열
- **schoolday.group**: 각 수업일에 연관된 Group 엔티티 (필수 포함)
- **시간순 정렬**: 각 요일 내에서 startsAt 기준 오름차순 정렬
- **중복 제거**: 동일한 schoolday는 중복 배제

### 💡 사용 시점
- 학생 주간 시간표 생성
- 학부모 앱에서 이번 주 수업 일정 확인
- 출석 관리를 위한 주간 수업 현황
- 수업 시간 충돌 여부 확인
- 주간 학습 계획 수립

### 📝 정확한 응답 예시
\`\`\`json
{
  "SUN": [],
  "MON": [
    {
      "id": 1,
      "schoolId": 1,
      "termId": 1,
      "lessonId": 1,
      "groupId": 1,
      "name": "수학",
      "startsAt": "2024-06-03T14:40:00+09:00",
      "endsAt": "2024-06-03T15:20:00+09:00",
      "duration": 40,
      "updatedBy": null,
      "note": null,
      "startNotifiedAt": null,
      "endNotifiedAt": null,
      "group": {
        "id": 1,
        "groupName": "수학A반",
        "location": "1-1교실",
        "capacity": 20,
        "allowedGrades": "1,2,3",
        "weekday": "MONDAY",
        "start": "14:40",
        "end": "15:20",
        "status": "CONFIRMED",
        "tuition": 100000,
        "bookFee": 5000,
        "materialFee": 3000,
        "days": 18,
        "note": "기초 수학 과정"
      }
    },
    {
      "id": 5,
      "schoolId": 1,
      "termId": 1,
      "lessonId": 3,
      "groupId": 3,
      "name": "과학",
      "startsAt": "2024-06-03T16:00:00+09:00",
      "endsAt": "2024-06-03T17:00:00+09:00",
      "duration": 60,
      "updatedBy": null,
      "note": null,
      "startNotifiedAt": "2024-06-03T15:50:00+09:00",
      "endNotifiedAt": "2024-06-03T17:00:00+09:00",
      "group": {
        "id": 3,
        "groupName": "과학실험반",
        "location": "실험실",
        "capacity": 15,
        "allowedGrades": "3,4",
        "weekday": "MONDAY",
        "start": "16:00",
        "end": "17:00",
        "status": "CONFIRMED",
        "tuition": 120000,
        "bookFee": 10000,
        "materialFee": 8000,
        "days": 16,
        "note": "실험 도구 사용"
      }
    }
  ],
  "TUE": [],
  "WED": [
    {
      "id": 3,
      "schoolId": 1,
      "termId": 1,
      "lessonId": 2,
      "groupId": 2,
      "name": "영어",
      "startsAt": "2024-06-05T15:00:00+09:00",
      "endsAt": "2024-06-05T16:00:00+09:00",
      "duration": 60,
      "updatedBy": "MANAGER",
      "note": "보강 수업",
      "startNotifiedAt": "2024-06-05T14:50:00+09:00",
      "endNotifiedAt": "2024-06-05T16:00:00+09:00",
      "group": {
        "id": 2,
        "groupName": "영어B반",
        "location": "어학실",
        "capacity": 15,
        "allowedGrades": "2,3",
        "weekday": "WEDNESDAY",
        "start": "15:00",
        "end": "16:00",
        "status": "CONFIRMED",
        "tuition": 120000,
        "bookFee": 8000,
        "materialFee": 2000,
        "days": 16,
        "note": null
      }
    }
  ],
  "THU": [],
  "FRI": [],
  "SAT": []
}
\`\`\`

### 🔍 API 호출 예시
\`\`\`
GET /schools/1/terms/1/students/123/weekly-schooldays
GET /schools/1/terms/1/students/123/weekly-schooldays?date=2024-06-03
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
      example: 123,
    }),
    ApiQuery({
      name: 'date',
      required: false,
      type: String,
      description:
        '기준 날짜 (yyyy-MM-dd 형식). null인 경우 오늘 날짜 기준으로 해당 주 계산',
      example: '2024-06-03',
      schema: {
        type: 'string',
        format: 'date',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
    }),
    ApiOkResponse({
      description: '✅ 학생 주간 수업일 요일별 목록 (Group 정보 포함)',
      schema: {
        type: 'object',
        properties: {
          SUN: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '일요일 수업일 목록',
          },
          MON: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '월요일 수업일 목록',
          },
          TUE: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '화요일 수업일 목록',
          },
          WED: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '수요일 수업일 목록',
          },
          THU: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '목요일 수업일 목록',
          },
          FRI: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '금요일 수업일 목록',
          },
          SAT: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
            description: '토요일 수업일 목록',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
