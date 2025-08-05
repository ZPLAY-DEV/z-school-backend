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
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Booking } from 'src/domain/booking/entities/booking.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { CreateStudentDto } from 'src/domain/student/dto/create-student.dto';
import { DailyNextStopDto } from 'src/domain/student/dto/update-student-next-stop.dto';
import { UpdateStudentDto } from 'src/domain/student/dto/update-student.dto';
import { Student } from 'src/domain/student/entities/student.entity';

// Student 페이지네이션 설정
const STUDENT_CONFIG: PaginateConfig<Student> = {
  sortableColumns: ['id', 'grade'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    grade: [FilterOperator.EQ],
    status: [FilterOperator.EQ],
    schoolId: [FilterOperator.EQ],
  },
};

// Group 페이지네이션 설정
const GROUP_CONFIG: PaginateConfig<Group> = {
  sortableColumns: ['id'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    status: [FilterOperator.EQ],
  },
};

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
- **선택 정보**: class, studentCode, name, phone, escortPhone, nextStop, status, note
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

export const FindStudentsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📄 학생 목록 조회 (페이지네이션)',
      description: `
### 📋 기능 설명
페이지네이션을 지원하는 학생 목록을 조회합니다.

### 🔍 검색 및 필터링
- **검색 가능**: name, phone
- **정렬 가능**: id, grade
- **필터링**: grade, status, schoolId

### 💡 사용 예시
- 학생 관리 화면의 목록
- 검색 및 필터링 기능
- 무한 스크롤 구현
      `,
    }),
    ApiPaginationQuery(STUDENT_CONFIG),
    ApiOkPaginatedResponse(Student, STUDENT_CONFIG),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

export const FindStudentByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 학생 상세 조회',
      description: `
### 📋 기능 설명
특정 학생의 상세 정보를 조회합니다.

### 📊 포함 정보
- 학생 기본 정보
- 학부모 정보 (relations 포함)
- 학교 정보 (relations 포함)
- 등록/수정 이력

### 💡 사용 시점
- 학생 상세 페이지
- 학생 정보 수정 폼
- 학부모 앱에서 자녀 정보 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 상세 정보',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID 또는 삭제된 학생',
    }),
  );

export const FindStudentSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 오늘의 수업 또는 특정일의 수업 조회',
      description: `
### 📋 기능 설명
특정 학생의 오늘 수업 또는 특정일의 수업 일정을 조회합니다.

🏷️ 조회 조건
- 기본: 오늘 날짜의 수업 조회
- 특정일: date 파라미터로 특정 날짜의 수업 조회
- 학기 필터: termId 전달 시 해당 학기의 수업만 필터링

### 💡 사용 시점
- 학생 출석 현황 조회
- 학부모 앱에서 자녀 수업 일정 확인
- 수업료 정산 근거 자료
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 수업일 목록',
      type: Schoolday,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const FindStudentBookingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📋 학생 수강신청 목록 조회 ❌ deprecated',
      description: `
### 📋 기능 설명
특정 학생의 수강신청 목록을 조회합니다.

### 🔍 필터링 옵션
- **termId**: 특정 학기의 예약만 조회
- **전체**: termId 생략시 모든 학기 예약

### 💡 사용 시점
- 학생 수강 이력 조회
- 학부모 수강신청 현황 확인
- 수업료 정산 및 환불 처리
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 예약 목록',
      type: Booking,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const FindStudentGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회 ❌ deprecated',
      description: `
### 📋 기능 설명
특정 학생이 수강중인 반 목록을 조회합니다.

### 🔍 필터링 옵션
- **termId**: 특정 학기의 그룹만 조회
- **전체**: termId 생략시 모든 학기 그룹

### 💡 사용 시점
- 학생 수강 현황 조회
- 반 이동 및 변경 처리
- 출석 관리 시스템
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 소속 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const FindStudentGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👌 학생 수강중인 반 목록 조회 (페이지네이션) ❌ deprecated',
      description: `
### 📋 기능 설명
특정 학생이 수강중인 반 목록을 페이지네이션으로 조회합니다.

### 🔍 검색 및 필터링
- **검색 가능**: name (그룹명)
- **정렬 가능**: id
- **필터링**: status (그룹 상태)
- **termId**: 학기별 필터링

### 💡 사용 시점
- 대량의 그룹 데이터 조회
- 무한 스크롤 구현
- 검색 기능이 필요한 경우
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

export const FindStudentCanceledGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회 ❌ deprecated',
      description: `
### 📋 기능 설명
학생이 수강 취소한 반 목록을 조회합니다.

### 🔍 필터링 옵션
- **termId**: 특정 학기의 취소 그룹만 조회
- **전체**: termId 생략시 모든 학기 취소 그룹

### 💡 사용 시점
- 수강료 환불 처리
- 대체 수업 안내
- 수강 이력 관리
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 취소 그룹 목록',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

export const FindStudentCanceledGroupsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🤚 학생 수강 취소한 반 목록 조회 (페이지네이션) ❌ deprecated',
      description: `
### 📋 기능 설명
학생 수강 취소한 반 목록을 페이지네이션으로 조회합니다.

### 🔍 검색 및 필터링
- **검색 가능**: name (그룹명)
- **정렬 가능**: id
- **필터링**: status (그룹 상태)
- **termId**: 학기별 필터링

### 💡 사용 시점
- 대량의 취소 그룹 데이터 조회
- 환불 처리 현황 관리
- 통계 및 분석 자료
      `,
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
      required: false,
      description: '학기 ID (생략시 전체 학기)',
      example: 1,
    }),
    ApiPaginationQuery(GROUP_CONFIG),
    ApiOkPaginatedResponse(Group, GROUP_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Update
//? ---------------------------------------------------------------------- ?//

export const UpdateStudentDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ Update Student Information',
      description: `
### 📋 Function Description
Update existing student information.

### 🔄 Updatable Fields
- **Student Info**: grade, class, studentCode, name, phone, nextStop, nextStops, status, note
- **Parent Info**: name, phone, note, termsAgreedAt

### 📍 Next Stop Information (nextStops)
- **nextStops**: Array of daily next stop information (Recommended)
  - place: Destination after school (Required)
  - name: Person accompanying the student (Optional)
  - phone: Phone number of accompanying person (Optional)
- **nextStop**: String format next stop (Legacy support)

### 📊 nextStops Array Support Cases
1. **Empty Array []**: Clears nextStop field (sets to null)
2. **Single Item**: Uses only the first item
   Example: [{"place": "Home", "name": "Mom", "phone": "01012345678"}]
3. **2-5 Items**: Uses only the first item (legacy compatibility)
   Example: [{"place": "Home", "name": "Mom", "phone": "01012345678"}, {"place": "Academy", "name": null, "phone": null}]
4. **6 Items (Complete Week)**: Uses all items for full week coverage
   Example: 6 items representing Monday to Saturday
5. **6+ Items**: Uses all items (comma-separated format)

### ⛔ Non-updatable Fields
- **schoolId**: School change requires transfer process
- **parentId**: Parent change requires separate process

### ⚠️ Important Notes
- Partial update supported (send only fields to change)
- Student code duplicate check (within same school)
- Phone number format validation
- Use either nextStops or nextStop, not both (nextStops recommended)
- Empty array clears next stop information
- Null values for name and phone are supported
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: 'Student ID to update',
      example: 1,
    }),
    ApiBody({
      type: UpdateStudentDto,
      examples: {
        grade_update: {
          summary: 'Grade Promotion',
          description: 'Update grade only',
          value: {
            grade: 4,
            class: '4-1',
          },
        },
        contact_update: {
          summary: 'Contact Information Update',
          description: 'Update student and parent contact information',
          value: {
            phone: '01098765432',
            parent: {
              phone: '01087654321',
              note: 'Available only on weekday afternoons',
            },
          },
        },
        nextstops_single: {
          summary: 'Single Next Stop Update',
          description: 'Update with single next stop information',
          value: {
            nextStops: [{ place: 'Home', name: 'Mom', phone: '01012345678' }],
          },
        },
        nextstops_complete: {
          summary: 'Complete Week Next Stop Update',
          description:
            'Update with full week next stop information (Recommended)',
          value: {
            nextStops: [
              { place: 'Home', name: 'Mom', phone: '01012345678' },
              { place: 'Academy', name: null, phone: null },
              { place: 'Library', name: 'Friend', phone: '01087654321' },
              { place: 'Home', name: null, phone: null },
              { place: 'Academy', name: 'Mom', phone: '01012345678' },
              { place: 'Home', name: null, phone: null },
            ],
          },
        },
        nextstops_clear: {
          summary: 'Clear Next Stop Information',
          description: 'Clear next stop information by sending empty array',
          value: {
            nextStops: [],
          },
        },
        status_update: {
          summary: 'Student Status Change',
          description: 'Transfer process',
          value: {
            status: 'TRANSFERRED',
            note: 'Transferred in January 2025',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '✅ Student information updated successfully',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description:
        '🚫 Request data error - Invalid data format, grade range exceeded, phone format error',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 Resource not found - Non-existent student ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description:
        '⚠️ Data conflict - Student code duplicate within same school',
    }),
  );

export const UpdateStudentNextStopDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📍 학생 하교장소 수정 (Deprecated)',
      description: `
### ⚠️ Deprecated
이 엔드포인트는 더 이상 권장되지 않습니다. 
대신 \`PATCH /students/:id\` 엔드포인트의 \`nextStops\` 필드를 사용하세요.

### 📋 기능 설명
학생의 요일별 하교장소 정보를 수정합니다.

### 📅 요일별 정보 구조
각 요일(월~토)마다 다음 정보를 포함:
- **place**: 하교 후 가는 장소 (필수)
- **name**: 함께 가는 사람 이름 (선택, nullable)
- **phone**: 함께 가는 사람 전화번호 (선택, nullable)

### 📝 데이터 형식
- 요일은 한글 키로 구분: 월, 화, 수, 목, 금, 토
- 모든 요일 정보를 한 번에 전송
- name과 phone은 null 값 허용

### ⚠️ 주의사항
- 기존 하교장소 정보는 완전히 덮어쓰기
- 모든 요일 정보를 포함하여 전송
- 전화번호는 하이픈 없이 숫자만 입력
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 학생 ID',
      example: 1,
    }),
    ApiBody({
      type: DailyNextStopDto,
      examples: {
        complete_update: {
          summary: '전체 하교장소 정보 수정',
          description: '모든 요일의 하교장소 정보를 한 번에 수정',
          value: {
            월: {
              place: '당구장',
              name: '친구',
              phone: '01012340001',
            },
            화: {
              place: '찜질방',
              name: '친구',
              phone: '01012340002',
            },
            수: {
              place: '당구장',
              name: '친구',
              phone: '01012340003',
            },
            목: {
              place: '탁구장',
              name: '친구',
              phone: '01012340004',
            },
            금: {
              place: '게임방',
              name: '친구',
              phone: '01012340005',
            },
            토: {
              place: '노래방',
              name: '친구',
              phone: '01012340006',
            },
          },
        },
        nullable_fields: {
          summary: 'nullable 필드 예시',
          description: 'name과 phone이 null인 경우',
          value: {
            월: {
              place: '집',
              name: null,
              phone: null,
            },
            화: {
              place: '학원',
              name: '엄마',
              phone: null,
            },
            수: {
              place: '도서관',
              name: null,
              phone: '01012340000',
            },
            목: {
              place: '집',
              name: null,
              phone: null,
            },
            금: {
              place: '학원',
              name: '엄마',
              phone: '01012340000',
            },
            토: {
              place: '집',
              name: null,
              phone: null,
            },
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '✅ 학생 하교장소 수정 완료',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: '🚫 요청 데이터 오류 - 잘못된 데이터 형식, 필수 필드 누락',
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
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
- **관련 데이터 체크**: 수강 이력, 출석 기록, 예약 정보
- **연관 관계**: 학부모와의 연결 해제 확인
- **완전 삭제**: 복구 불가능한 영구 삭제

### 🚫 삭제 제한 사항
- 진행 중인 수업이 있는 경우 삭제 불가
- 미정산 수강료가 있는 경우 삭제 불가
- 최근 1개월 이내 활동 이력이 있는 경우 주의 필요

### 💡 대안 방안
- **상태 변경**: 삭제 대신 'TRANSFERRED' 상태로 변경
- **비활성화**: 논리적 삭제로 데이터 보존

### ⚠️ 주의사항
- **되돌릴 수 없는 작업**
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
    ApiOkResponseTemplate({
      description: '✅ 학생 삭제 완료',
      type: Student,
    }),
    ApiResponse({
      status: StatusCodes.NOT_FOUND,
      description: '🔍 학생 없음 - 존재하지 않는 학생 ID',
    }),
    ApiResponse({
      status: StatusCodes.CONFLICT,
      description: '⚠️ 삭제 불가 - 진행 중인 수업 존재, 미정산 수강료 존재',
    }),
    ApiResponse({
      status: StatusCodes.FORBIDDEN,
      description: '🔒 권한 없음 - 삭제 권한 없는 사용자',
    }),
  );
