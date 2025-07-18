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
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { ResponseSchoolOfferingListDto } from 'src/domain/school/dto/response-school-offering-list.dto';

const SCHOOL_TERM_OFFERING_CONFIG: PaginateConfig<Offering> = {
  sortableColumns: ['id', 'lessonName', 'groupName'] as const,
  searchableColumns: ['lessonName', 'groupName'] as const,
  defaultSortBy: [['id', 'DESC']] as const,
  filterableColumns: {
    pickRule: [FilterOperator.EQ, FilterOperator.IN],
    allowedGrades: [FilterOperator.EQ, FilterOperator.IN],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 학기별 수강신청과목 일괄 생성',
      description: `
**📝 기능 설명**
특정 학기에 속한 학교의 과목 정보를 바탕으로 수강신청과목(Offering)을 일괄 생성합니다.

**🔄 비즈니스 로직**
- 학기 ID에 연결된 과목(Lesson)과 반(Group) 정보를 조합하여 수강신청과목 생성
- 기존 수강신청과목이 있는 경우 중복 생성 방지
- 각 과목별로 수강 가능 학년과 픽 규칙을 자동 설정
- \`[PATCH] /v1/terms/:id\` 학기 수정 시 수강신청기간 설정과 동일한 로직 실행

**⚠️ 중요 제약사항**
- 학기 ID가 유효해야 함 (존재하는 학기)
- 해당 학기에 연결된 과목과 반이 있어야 함
- 이미 수강신청과목이 생성된 학기의 경우 중복 생성되지 않음

**📚 예시 시나리오**
1. **신규 학기 수강신청과목 생성**: 새로운 학기가 시작되어 수강신청과목을 일괄 생성
2. **수강신청기간 설정 연동**: 관리자가 수강신청기간을 설정할 때 자동으로 수강신청과목 생성
3. **과목 추가 후 재생성**: 학기 중 새로운 과목이 추가된 후 수강신청과목 재생성

**API 호출 예시**
\`\`\`
POST /v1/schools/123/terms/456/offerings
\`\`\`

**성공 응답 예시**
\`\`\`json
[
  {
    "id": 789,
    "lessonName": "수학",
    "groupName": "1-1",
    "pickRule": "FIRST_COME_FIRST_SERVED",
    "allowedGrades": [1],
    "maxStudents": 25,
    "createdAt": "2024-01-15T09:00:00Z"
  },
  {
    "id": 790,
    "lessonName": "영어",
    "groupName": "1-2", 
    "pickRule": "LOTTERY",
    "allowedGrades": [1],
    "maxStudents": 20,
    "createdAt": "2024-01-15T09:00:00Z"
  }
]
\`\`\`

**실패 응답 예시**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학기를 찾을 수 없습니다",
  "error": "Not Found"
}
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
    ApiCreatedResponseTemplate({
      description: '수강신청과목 일괄 생성 완료',
      type: Offering,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📊 학기별 수강신청과목 페이지네이션 목록',
      description: `
**📝 기능 설명**
특정 학기에 속한 수강신청과목들의 페이지네이션된 목록을 조회합니다.

**🔄 비즈니스 로직**
- 학기별로 생성된 모든 수강신청과목을 페이지 단위로 조회
- 과목명(lessonName), 반명(groupName)으로 검색 가능
- 픽 규칙(pickRule), 수강 가능 학년(allowedGrades)으로 필터링 가능
- ID, 과목명, 반명 기준으로 정렬 가능

**⚠️ 중요 제약사항**
- 학교 ID와 학기 ID가 유효해야 함
- 페이지 크기는 최대 100개로 제한
- 검색어는 최소 2글자 이상 입력

**📚 예시 시나리오**
1. **전체 수강신청과목 관리**: 관리자가 학기별 모든 수강신청과목을 페이지별로 관리
2. **과목 검색**: "수학" 키워드로 수학 관련 수강신청과목만 필터링
3. **학년별 필터링**: 1학년만 수강 가능한 과목들을 필터링하여 조회
4. **픽 규칙별 조회**: 선착순 방식의 수강신청과목만 조회

**API 호출 예시**
\`\`\`
GET /v1/schools/123/terms/456/offerings/paginated?page=1&limit=20&search=수학&pickRule=FIRST_COME_FIRST_SERVED
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "data": [
    {
      "id": 789,
      "lessonName": "수학",
      "groupName": "1-1",
      "pickRule": "FIRST_COME_FIRST_SERVED",
      "allowedGrades": [1],
      "maxStudents": 25,
      "currentStudents": 20
    }
  ],
  "meta": {
    "itemsPerPage": 20,
    "totalItems": 1,
    "currentPage": 1,
    "totalPages": 1
  }
}
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
    ApiPaginationQuery(SCHOOL_TERM_OFFERING_CONFIG),
    ApiOkPaginatedResponse(Offering, SCHOOL_TERM_OFFERING_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 학기별 수강신청과목 전체 목록',
      description: `
**📝 Notes**
Since this API has to return personalized results each time, you are required to provide the currently selected offering IDs.

**📋 required params**
- \`schoolId\`: 학교 ID (path parameter)
- \`termId\`: 학기 ID (path parameter)  
- \`studentId\`: 학생 ID (query parameter)
- \`grade\`: 학년 (query parameter)

**📋 optional params**
- \`selected\`: selected offerings by the student in the format of a comma separated offering Ids

**API 호출 예시**
\`\`\`
GET /v1/schools/123/terms/456/offerings?studentId=789&grade=1&selected=1,2,3
\`\`\`

**Request Parameters:**
\`\`\`
Path Parameters:
- schoolId: 123 (학교 ID)
- termId: 456 (학기 ID)

Query Parameters:
- studentId: 789 (required)
- grade: 1 (required, 1-6)
- selected: a comma separated offering Ids (optional)
\`\`\`

**Response Example:**
\`\`\`json
[
  {
    "id": 1001,
    "schoolId": 123,
    "termId": 456,
    "lessonId": 789,
    "lessonName": "수학",
    "groupName": "1-1",
    "samName": "김선생님",
    "capacity": 25,
    "bookingCount": 18,
    "prepicked": 2,
    "allowedGrades": [1, 2],
    "pickRule": "FIRST_COME_FIRST_SERVED",
    "times": [
      {
        "start": "09:00",
        "end": "09:50",
        "dayOfWeek": 1
      },
      {
        "start": "10:00", 
        "end": "10:50",
        "dayOfWeek": 3
      }
    ],
    "prepickedStudentIds": [567, 890],
    "status": "ACTIVE",
    "totals": [50000, 45000],
    "booking": {
      "id": 2001,
      "studentId": 789,
      "lessonName": "수학",
      "offeringId": 1001,
      "status": "ENROLLED",
      "waitingPosition": 0,
      "createdAt": "2024-01-15T09:00:00.000Z"
    },
    "selectable": true
  },
  {
    "id": 1002,
    "schoolId": 123,
    "termId": 456,
    "lessonId": 790,
    "lessonName": "영어",
    "groupName": "1-2",
    "samName": "이선생님",
    "capacity": 20,
    "bookingCount": 20,
    "prepicked": 1,
    "allowedGrades": [1],
    "pickRule": "RANDOM",
    "times": [
      {
        "start": "11:00",
        "end": "11:50", 
        "dayOfWeek": 2
      }
    ],
    "prepickedStudentIds": [234],
    "status": "ACTIVE",
    "totals": [40000],
    "booking": null,
    "selectable": false
  }
]
\`\`\`

**📊 Response Fields**
- \`totals\`: the total cost array for each class (tuition + textbook fee + material fee)
- \`booking\`: booking record if exists
- \`selectable\`: "true" (able to select the class), "false" (unable to select the class. bitmasks intersection found)
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
    ApiQuery({
      name: 'studentId',
      description: '학생 ID (필수)',
      required: true,
      example: 789,
    }),
    ApiQuery({
      name: 'grade',
      description: '학년 (1-6, 필수)',
      required: true,
      example: 1,
    }),
    ApiQuery({
      name: 'selected',
      description: '선택된 과목만 조회 (선택적)',
      required: false,
      example: 'true',
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 전체 목록 조회 완료',
      type: ResponseSchoolOfferingListDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete School > Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 학기별 수강신청과목 전체 삭제',
      description: `
**📝 기능 설명**
특정 학기에 속한 모든 수강신청과목을 일괄 삭제합니다.

**🔄 비즈니스 로직**
- 해당 학기의 모든 수강신청과목을 한 번에 삭제
- 삭제된 수강신청과목의 개수를 반환
- 관련된 수강신청(Pick) 정보도 함께 삭제됨
- 삭제 후 해당 학기의 수강신청과목이 모두 초기화됨

**⚠️ 중요 제약사항**
- 학교 ID와 학기 ID가 유효해야 함
- 수강신청기간 중에는 삭제가 제한될 수 있음
- 이미 진행 중인 수업이 있는 경우 삭제 불가
- 관리자 권한이 필요한 작업

**📚 예시 시나리오**
1. **학기 초기화**: 새 학기 준비를 위해 이전 학기의 수강신청과목 전체 삭제
2. **과목 재편성**: 과목 구성이 크게 변경되어 기존 수강신청과목을 모두 삭제 후 재생성
3. **테스트 데이터 정리**: 테스트 환경에서 생성된 수강신청과목 데이터 정리
4. **학기 취소**: 특별한 사유로 학기가 취소되어 관련 수강신청과목 모두 삭제

**API 호출 예시**
\`\`\`
DELETE /v1/schools/123/terms/456/offerings
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "deletedCount": 42,
  "message": "42개의 수강신청과목이 성공적으로 삭제되었습니다"
}
\`\`\`

**실패 응답 예시 - 수강신청기간 중 삭제 시도**
\`\`\`json
{
  "statusCode": 400,
  "message": "수강신청기간 중에는 수강신청과목을 삭제할 수 없습니다",
  "error": "Bad Request"
}
\`\`\`

**실패 응답 예시 - 진행 중인 수업 존재**
\`\`\`json
{
  "statusCode": 400,
  "message": "진행 중인 수업이 있는 수강신청과목은 삭제할 수 없습니다",
  "error": "Bad Request"
}
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
    ApiOkResponse({
      description: '수강신청과목 전체 삭제 완료',
      schema: {
        type: 'object',
        properties: {
          deletedCount: {
            type: 'number',
            description: '삭제된 수강신청과목의 수',
            example: 42,
          },
          message: {
            type: 'string',
            description: '삭제 완료 메시지',
            example: '42개의 수강신청과목이 성공적으로 삭제되었습니다',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
