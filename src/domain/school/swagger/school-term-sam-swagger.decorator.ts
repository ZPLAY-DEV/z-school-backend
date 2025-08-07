import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { ResponseSchoolTermSamOfferingDto } from '../dto/response-school-term-sam-offering.dto';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Offerings
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamOfferingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📚 담임쌤 수강신청 과목 조회 (그룹별 수업료 포함)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 담임쌤이 담당하는 수강신청 과목 목록을 조회합니다.
각 offering에 대해 연관된 그룹들의 수업료 정보를 함께 제공합니다.

### 🔄 비즈니스 로직
- 담임쌤이 담당하는 계약(contract)을 통해 연관된 수강신청 과목들 조회
- 중복된 offering 제거하여 unique한 목록만 반환
- 각 offering.groupIds에 포함된 모든 그룹들의 수업료 정보 포함
- contract.endedBy IS NULL 조건으로 활성 계약만 조회

### 📊 응답 데이터 구조
- **ResponseSchoolTermSamOfferingDto[]: 수강신청 과목 목록 배열**
- **기본 offering 정보**: 과목명, 반명, 강사명, 정원, 수강신청 규칙 등
- **groupTuitions**: 해당 offering에 속한 각 그룹들의 수업료 정보
  - groupId: 그룹 ID
  - groupName: 반 이름
  - tuition: 수업료 합계

### 💡 사용 시점
- 담임쌤이 담당하는 수강신청 과목 확인
- 수업료 정보와 함께 과목별 재정 계획 수립
- 학기별 담당 과목 현황 파악
- 그룹별 수업료 차이 비교 분석

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "schoolId": 1,
    "termId": 1,
    "lessonId": 100,
    "schoolName": "한국초등학교",
    "lessonName": "수학",
    "groupName": "수학 종합반",
    "samName": "김선생",
    "capacity": 20,
    "bookingCount": 15,
    "prepicked": 3,
    "allowedGrades": [1, 2, 3],
    "pickRule": "FIRST",
    "times": [
      {
        "weekday": "MONDAY",
        "start": "14:40",
        "end": "15:20"
      },
      {
        "weekday": "WEDNESDAY", 
        "start": "14:40",
        "end": "15:20"
      }
    ],
    "bitmasks": [1024, 4096],
    "groupIds": [456, 457],
    "prepickedStudentIds": [10, 20, 30],
    "lastSyncTimestamp": 1709567400000,
    "status": "CONFIRMED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "groupTuitions": [
      {
        "groupId": 456,
        "groupName": "수학A반",
        "tuition": 100000
      },
      {
        "groupId": 457,
        "groupName": "수학B반", 
        "tuition": 120000
      }
    ]
  },
  {
    "id": 2,
    "schoolId": 1,
    "termId": 1,
    "lessonId": 101,
    "schoolName": "한국초등학교",
    "lessonName": "영어",
    "groupName": "영어 기초반",
    "samName": "김선생",
    "capacity": 15,
    "bookingCount": 12,
    "prepicked": 2,
    "allowedGrades": [2, 3],
    "pickRule": "FIRST",
    "times": [
      {
        "weekday": "TUESDAY",
        "start": "15:00",
        "end": "16:00"
      }
    ],
    "bitmasks": [2048],
    "groupIds": [458],
    "prepickedStudentIds": [15, 25],
    "lastSyncTimestamp": 1709567400000,
    "status": "CONFIRMED",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "groupTuitions": [
      {
        "groupId": 458,
        "groupName": "영어기초반",
        "tuition": 90000
      }
    ]
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
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 담임쌤 수강신청 과목 목록 (그룹별 수업료 정보 포함)',
      type: ResponseSchoolTermSamOfferingDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 담임쌤 수업일 조회 (all)',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 담임쌤의 수업일 목록을 조회합니다.

### 🔄 비즈니스 로직
- 담임쌤이 담당하는 모든 반의 수업일 조회
- 해당 학기에 진행되는 수업일만 포함
- **필수 Group 관계 포함**: 각 schoolday에는 연관된 Group 엔티티가 반드시 포함됩니다
- 시작 시간 기준으로 자동 정렬하여 시간순으로 제공
- contract.endedBy IS NULL 조건으로 활성 계약만 조회

### 📊 응답 데이터 구조
- **Schoolday[]: 수업일 목록 배열**
- **schoolday.group**: 각 수업일에 연관된 Group 엔티티 (필수 포함)
  - 반 이름, 수업 장소, 정원, 수업료 등 상세 정보
  - 수업 시간(start, end), 요일(weekday) 정보
- **시간순 정렬**: startsAt 기준 오름차순 정렬

### 💡 사용 시점
- 담임쌤 수업 스케줄 조회
- 출석 관리 시스템에서 담임쌤별 수업 현황 확인
- 수업료 정산 근거 자료
- 담임쌤 앱에서 전체 수업 일정 확인
- 반별 수업 정보와 함께 수업일 확인

### 📝 정확한 응답 예시
\`\`\`json
[
  {
    "id": 1,
    "groupId": 456,
    "startsAt": "2024-03-04T14:40:00.000Z",
    "endsAt": "2024-03-04T15:20:00.000Z",
    "isActive": true,
    "startNotifiedAt": null,
    "endNotifiedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "group": {
      "id": 456,
      "samId": 123,
      "lessonId": 789,
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
      "note": "기초 수학 과정",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  {
    "id": 2,
    "groupId": 457,
    "startsAt": "2024-03-04T15:00:00.000Z",
    "endsAt": "2024-03-04T16:00:00.000Z",
    "isActive": true,
    "startNotifiedAt": null,
    "endNotifiedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "group": {
      "id": 457,
      "samId": 123,
      "lessonId": 790,
      "groupName": "영어B반",
      "location": "어학실",
      "capacity": 15,
      "allowedGrades": "2,3",
      "weekday": "MONDAY",
      "start": "15:00",
      "end": "16:00",
      "status": "CONFIRMED",
      "tuition": 120000,
      "bookFee": 8000,
      "materialFee": 2000,
      "days": 16,
      "note": null,
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
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 담임쌤 수업일 목록 (Group 정보 포함)',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School Term Sam Weekly Schooldays
//? ---------------------------------------------------------------------- ?//

export const SchoolTermSamWeeklySchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 담임쌤 주간 수업일 조회',
      description: `
### 📋 기능 설명
특정 학교의 특정 학기에서 특정 담임쌤의 주간 수업일 목록을 요일별로 그룹화하여 조회합니다.

### 🔄 비즈니스 로직
- 지정된 날짜(또는 오늘)가 포함된 주(일요일~토요일)의 수업일 조회
- 담임쌤이 담당하는 모든 반의 수업일 포함
- 요일별로 그룹화하여 반환 (SUN, MON, TUE, WED, THU, FRI, SAT)
- **필수 Group 관계 포함**: 각 schoolday에는 연관된 Group 엔티티가 반드시 포함됩니다
- 각 요일별로 시간 순으로 정렬하여 제공
- contract.endedBy IS NULL 조건으로 활성 계약만 조회

### 📊 응답 데이터 구조
- **Record<string, Schoolday[]>**: 요일별 수업일 그룹화 객체
- **Key**: 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'
- **Value**: 해당 요일의 Schoolday 배열 (Group 정보 포함)
- **각 요일별 시간순 정렬**: startsAt 기준 오름차순 정렬

### 📅 주간 계산 로직
- date 파라미터가 없으면 현재 날짜 기준
- 해당 날짜가 포함된 주의 일요일부터 토요일까지 범위 계산
- 안전한 KST 시간대 처리 (Asia/Seoul)

### 💡 사용 시점
- 담임쌤 주간 스케줄 확인
- 주간 수업 계획 수립
- 담임쌤 앱에서 주별 수업 일정 표시
- 요일별 수업 현황 분석
- 출석 관리 시스템에서 주간 뷰

### 📝 정확한 응답 예시
\`\`\`json
{
  "SUN": [],
  "MON": [
    {
      "id": 1,
      "groupId": 456,
      "startsAt": "2024-03-04T14:40:00.000Z",
      "endsAt": "2024-03-04T15:20:00.000Z",
      "isActive": true,
      "startNotifiedAt": null,
      "endNotifiedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "group": {
        "id": 456,
        "samId": 123,
        "lessonId": 789,
        "groupName": "수학A반",
        "location": "1-1교실",
        "capacity": 20,
        "weekday": "MONDAY",
        "start": "14:40",
        "end": "15:20",
        "status": "CONFIRMED"
      }
    }
  ],
  "TUE": [],
  "WED": [
    {
      "id": 2,
      "groupId": 457,
      "startsAt": "2024-03-06T15:00:00.000Z",
      "endsAt": "2024-03-06T16:00:00.000Z",
      "isActive": true,
      "startNotifiedAt": null,
      "endNotifiedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "group": {
        "id": 457,
        "samId": 123,
        "lessonId": 790,
        "groupName": "영어B반",
        "location": "어학실",
        "capacity": 15,
        "weekday": "WEDNESDAY",
        "start": "15:00",
        "end": "16:00",
        "status": "CONFIRMED"
      }
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
      name: 'samId',
      type: Number,
      description: '담임쌤 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'date',
      type: String,
      description: '기준 날짜 (YYYY-MM-DD 형식, 생략시 오늘 날짜)',
      example: '2024-03-04',
      required: false,
    }),
    ApiOkResponse({
      description:
        '✅ 담임쌤 주간 수업일 목록 (요일별 그룹화, Group 정보 포함)',
      schema: {
        type: 'object',
        properties: {
          SUN: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          MON: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          TUE: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          WED: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          THU: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          FRI: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
          SAT: {
            type: 'array',
            items: { $ref: '#/components/schemas/Schoolday' },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
