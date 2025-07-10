import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { Lesson } from '../entities/lesson.entity';

//? ============================================================================ ?//
//? Create Lesson
//? ============================================================================ ?//

export const CreateLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 과목 생성',
      description: `
### 📚 과목 생성 프로세스

**기능 개요:**
- 새로운 과목을 생성하고 함께 제공된 그룹 정보로 반과 강사도 동시에 생성합니다
- 복잡한 업무 로직이 포함된 중요한 엔드포인트입니다

**비즈니스 규칙:**
- ✅ 같은 학기(Term) 내에서 과목명은 고유해야 합니다
- ✅ 각 그룹에는 최소 1명의 강사가 배정되어야 합니다
- ✅ 수업료 구성: instructorFee + bookFees + materialFees + operationFee = total
- ✅ 수업 기간(start~end)은 해당 학기 기간 내에 있어야 합니다
- ✅ 강사는 해당 시간대에 다른 수업이 없어야 합니다 (중복 검증)

**주요 검증 사항:**
- 학교, 분류, 학기 정보의 유효성
- 강사의 시간 중복 여부
- 수업료 계산의 정확성
- 요일 및 시간 형식의 유효성

**연관 데이터 생성:**
- Lesson (과목)
- Group (반)
- Instructor (강사)
- 자동 관계 설정
      `,
    }),
    ApiExtraModels(CreateLessonDto),
    ApiBody({
      type: CreateLessonDto,
      examples: {
        basic: {
          summary: '기본 과목 생성',
          description: '필수 정보만으로 과목 생성',
          value: {
            termId: 1,
            categoryId: 2,
            schoolId: 1,
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            lessonName: '초등 영어 A반',
            description: '기초 영어 회화 수업',
            start: '2025-02-01',
            end: '2025-05-25',
            frequency: 1,
            total: 120000,
            instructorFee: 100000,
            operationFee: 20000,
            groups: [
              {
                instructorName: '마이클 존슨',
                instructorPhone: '01012345678',
                groupName: '영어 A반',
                location: '영어교실 1',
                capacity: 15,
                allowedGrades: '1~2',
                weekday: '월',
                start: '14:00',
                end: '14:40',
              },
            ],
          },
        },
        complete: {
          summary: '완전한 과목 생성',
          description: '모든 수업료 정보를 포함한 과목 생성',
          value: {
            termId: 1,
            categoryId: 3,
            schoolId: 1,
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            lessonName: '초등 수학 심화반',
            description: '수학 심화 과정',
            start: '2025-02-01',
            end: '2025-05-25',
            frequency: 2,
            total: 200000,
            instructorFee: 120000,
            bookFees: [
              { name: '교재비', amount: 30000 },
              { name: '문제집', amount: 20000 },
            ],
            materialFees: [{ name: '교구비', amount: 15000 }],
            operationFee: 15000,
            operationFeeRule: 'CO-1500',
            note: '수학 올림피아드 준비 과정',
            groups: [
              {
                instructorName: '김수학',
                instructorPhone: '01098765432',
                groupName: '수학 심화 A반',
                location: '수학교실 2',
                capacity: 12,
                allowedGrades: '3~4',
                weekday: '월',
                start: '15:00',
                end: '15:40',
              },
              {
                instructorName: '박수학',
                instructorPhone: '01087654321',
                groupName: '수학 심화 B반',
                location: '수학교실 3',
                capacity: 12,
                allowedGrades: '3~4',
                weekday: '수',
                start: '15:00',
                end: '15:40',
              },
            ],
          },
        },
        multipleInstructors: {
          summary: '여러 강사가 있는 과목',
          description: '복수의 반과 강사로 구성된 과목',
          value: {
            termId: 1,
            categoryId: 1,
            schoolId: 1,
            lessonName: '축구 교실',
            start: '2025-02-01',
            end: '2025-05-25',
            frequency: 1,
            total: 80000,
            instructorFee: 60000,
            operationFee: 20000,
            groups: [
              {
                instructorName: '박축구',
                instructorPhone: '01011111111',
                groupName: '축구 초급반',
                location: '운동장',
                capacity: 20,
                allowedGrades: '1~2',
                weekday: '화',
                start: '16:00',
                end: '16:40',
              },
              {
                instructorName: '김축구',
                instructorPhone: '01022222222',
                groupName: '축구 중급반',
                location: '운동장',
                capacity: 20,
                allowedGrades: '3~4',
                weekday: '화',
                start: '17:00',
                end: '17:40',
              },
              {
                instructorName: '이축구',
                instructorPhone: '01033333333',
                groupName: '축구 고급반',
                location: '운동장',
                capacity: 15,
                allowedGrades: '5~6',
                weekday: '화',
                start: '18:00',
                end: '18:40',
              },
            ],
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '과목 생성 성공',
      type: Lesson,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.CONFLICT,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ============================================================================ ?//
//? Create Lesson (Dry Run)
//? ============================================================================ ?//

export const CreateLessonDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🧪 과목 생성 시뮬레이션',
      description: `
### 🧪 과목 생성 사전 검증

**기능 개요:**
- 실제 데이터 생성 없이 과목 생성 가능 여부를 사전 검증합니다
- 중복 검사 및 제약 조건 위반 사항을 미리 확인할 수 있습니다

**검증 항목:**
- ✅ 같은 학기 내 과목명 중복 검사
- ✅ 강사의 시간 중복 검사
- ✅ 학교, 분류, 학기 정보 유효성
- ✅ 수업료 계산 정확성
- ✅ 요일/시간 형식 검증

**반환값:**
- **성공**: 생성될 과목 정보 미리보기 (실제 DB 저장 없음)
- **실패**: null (중복이나 제약 조건 위반 시)

**사용 시나리오:**
- 과목 생성 전 사전 검증
- UI에서 실시간 유효성 검사
- 배치 처리 전 데이터 검증
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
      examples: {
        valid: {
          summary: '유효한 과목 데이터',
          description: '생성 가능한 과목 정보',
          value: {
            termId: 1,
            categoryId: 2,
            schoolId: 1,
            lessonName: '신규 영어반',
            start: '2025-02-01',
            end: '2025-05-25',
            groups: [
              {
                instructorName: '새로운강사',
                instructorPhone: '01099999999',
                groupName: '신규반',
                location: '교실 A',
                capacity: 15,
                allowedGrades: '1~2',
                weekday: '금',
                start: '14:00',
                end: '14:40',
              },
            ],
          },
        },
        duplicate: {
          summary: '중복된 과목명',
          description: '이미 존재하는 과목명으로 null 반환',
          value: {
            termId: 1,
            categoryId: 2,
            schoolId: 1,
            lessonName: '기존 영어반',
            groups: [],
          },
        },
      },
    }),
    ApiOkResponse({
      description: '과목 생성 시뮬레이션 결과',
      schema: {
        oneOf: [
          {
            $ref: getSchemaPath(Lesson),
            description: '생성 가능한 경우: 과목 정보 미리보기',
          },
          {
            type: 'null',
            description: '생성 불가능한 경우: null',
          },
        ],
      },
      examples: {
        success: {
          summary: '생성 가능 - 유효한 데이터로 생성 가능',
          value: {
            id: null,
            lessonName: '신규 영어반',
            description: null,
            total: 0,
            status: 'PENDING',
            createdAt: null,
            updatedAt: null,
          },
        },
        conflict: {
          summary: '생성 불가능 - 중복이나 제약 조건 위반',
          value: null,
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.UNPROCESSABLE_ENTITY),
  );
};

//? ============================================================================ ?//
//? Get Lesson By ID
//? ============================================================================ ?//

export const GetLessonByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 과목 상세 조회',
      description: `
### 📖 과목 상세 정보 조회

**기능 개요:**
- 과목 ID로 상세 정보와 모든 연관 데이터를 조회합니다
- 과목에 속한 반, 학생, 계약 정보까지 포함한 완전한 정보를 제공합니다

**포함되는 연관 데이터:**
- ✅ **Groups**: 과목에 속한 모든 반 정보
- ✅ **Contracts**: 반별 계약 정보 (수강 신청)
- ✅ **SAM**: 계약의 학생-학부모 정보
- ✅ **Picks**: 확정 수강생 정보
- ✅ **Category**: 과목 분류 정보

**응답 구조:**
\`\`\`
{
  "id": 1,
  "lessonName": "초등 영어 A반",
  "groups": [
    {
      "id": 1,
      "groupName": "영어 A반",
      "contracts": [...],
      "picks": [...]
    }
  ],
  "category": {
    "id": 1,
    "categoryName": "언어"
  }
}
\`\`\`

**사용 시나리오:**
- 과목 관리 페이지
- 수강생 현황 확인
- 수업 계획 수립
- 성적 및 출석 관리
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 과목의 고유 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '과목 상세 정보 조회 성공',
      type: Lesson,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ============================================================================ ?//
//? Get Students By Lesson ID
//? ============================================================================ ?//

export const GetStudentsByLessonIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 과목별 학생 목록 조회',
      description: `
### 📋 과목에 등록된 모든 학생 조회

**기능 개요:**
- 특정 과목에 등록된 모든 학생을 페이지네이션으로 조회합니다
- 학생 기본 정보 + 소속 반 정보 + 수강 상태를 함께 제공합니다

**조회 경로:**
\`lesson → groups → picks → student\`

**확장 정보 (ExtendedStudent):**
- ✅ **학생 기본 정보**: 이름, 학년, 반 등
- ✅ **groupName**: 소속 반 이름
- ✅ **groupStart**: 수업 시작 시간
- ✅ **groupStartedBy**: 수강 시작 승인자

**페이지네이션 기능:**
- 페이지 번호 및 크기 설정
- 학생 이름으로 검색
- 학년별 필터링
- 수강 상태별 필터링

**정렬 옵션:**
- 학생 이름 (가나다순)
- 학년/반 순서
- 수강 시작일 순서
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '과목 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: '페이지 번호 (기본값: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: '페이지당 항목 수 (기본값: 20, 최대: 100)',
      example: 20,
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: '학생 이름 검색 (부분 일치)',
      example: '홍길동',
    }),
    ApiQuery({
      name: 'filter.grade',
      required: false,
      type: Number,
      description: '학년 필터 (1-6)',
      example: 3,
    }),
    ApiQuery({
      name: 'filter.class',
      required: false,
      type: String,
      description: '반 필터',
      example: '1반',
    }),
    ApiQuery({
      name: 'filter.status',
      required: false,
      type: String,
      description: '수강 상태 필터 (ACTIVE, INACTIVE, PENDING)',
      example: 'ACTIVE',
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      description: '정렬 기준 (studentName:ASC, grade:DESC 등)',
      example: 'studentName:ASC',
    }),
    ApiOkResponse({
      description: '과목별 학생 목록 조회 성공',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              description: '확장된 학생 정보 (기본 학생 정보 + 그룹 정보)',
              properties: {
                id: {
                  type: 'number',
                  description: '학생 ID',
                  example: 1,
                },
                studentName: {
                  type: 'string',
                  description: '학생 이름',
                  example: '홍길동',
                },
                grade: {
                  type: 'number',
                  description: '학년',
                  example: 3,
                },
                className: {
                  type: 'string',
                  description: '학교 반',
                  example: '1반',
                },
                status: {
                  type: 'string',
                  description: '학생 상태',
                  example: 'ACTIVE',
                },
                groupName: {
                  type: 'string',
                  description: '소속 반 이름',
                  example: '영어 A반',
                },
                groupStart: {
                  type: 'string',
                  description: '수업 시작 시간',
                  example: '14:00',
                },
                groupStartedBy: {
                  type: 'string',
                  enum: ['MANAGER', 'INSTRUCTOR', 'PARENT', 'OTHER'],
                  description: '수강 시작 승인자',
                  example: 'MANAGER',
                },
              },
            },
          },
          meta: {
            type: 'object',
            description: '페이지네이션 메타 정보',
            properties: {
              itemsPerPage: {
                type: 'number',
                description: '페이지당 항목 수',
                example: 20,
              },
              totalItems: {
                type: 'number',
                description: '전체 항목 수',
                example: 156,
              },
              currentPage: {
                type: 'number',
                description: '현재 페이지',
                example: 1,
              },
              totalPages: {
                type: 'number',
                description: '전체 페이지 수',
                example: 8,
              },
              sortBy: {
                type: 'array',
                description: '정렬 조건',
                items: { type: 'array' },
                example: [['studentName', 'ASC']],
              },
              search: {
                type: 'string',
                description: '검색어',
                example: '홍길동',
              },
              filter: {
                type: 'object',
                description: '필터 조건',
                example: { grade: 3, status: 'ACTIVE' },
              },
            },
          },
          links: {
            type: 'object',
            description: '페이지네이션 링크',
            properties: {
              first: {
                type: 'string',
                example: '/lessons/1/students/paginated?page=1',
              },
              previous: { type: 'string', nullable: true, example: null },
              current: {
                type: 'string',
                example: '/lessons/1/students/paginated?page=1',
              },
              next: {
                type: 'string',
                example: '/lessons/1/students/paginated?page=2',
              },
              last: {
                type: 'string',
                example: '/lessons/1/students/paginated?page=8',
              },
            },
          },
        },
      },
      examples: {
        success: {
          summary: '성공 응답',
          value: {
            data: [
              {
                id: 1,
                studentName: '홍길동',
                grade: 3,
                className: '1반',
                status: 'ACTIVE',
                groupName: '영어 A반',
                groupStart: '14:00',
                groupStartedBy: 'MANAGER',
              },
              {
                id: 2,
                studentName: '김영희',
                grade: 3,
                className: '2반',
                status: 'ACTIVE',
                groupName: '영어 A반',
                groupStart: '14:00',
                groupStartedBy: 'INSTRUCTOR',
              },
            ],
            meta: {
              itemsPerPage: 20,
              totalItems: 2,
              currentPage: 1,
              totalPages: 1,
              sortBy: [['studentName', 'ASC']],
              search: '',
              filter: {},
            },
            links: {
              first: '/lessons/1/students/paginated?page=1',
              previous: null,
              current: '/lessons/1/students/paginated?page=1',
              next: null,
              last: '/lessons/1/students/paginated?page=1',
            },
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ============================================================================ ?//
//? Update Lesson
//? ============================================================================ ?//

export const UpdateLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 과목 정보 수정',
      description: `
### ✏️ 과목 정보 업데이트

**기능 개요:**
- 과목의 기본 정보를 수정합니다
- 부분 업데이트 지원: 변경하려는 필드만 전송하면 됩니다

**수정 가능한 필드:**
- ✅ **lessonName**: 과목명 (학기 내 유니크)
- ✅ **description**: 과목 설명
- ✅ **start/end**: 수업 기간
- ✅ **frequency**: 주당 수업 횟수
- ✅ **수업료 정보**: total, instructorFee, bookFees, materialFees, operationFee
- ✅ **operationFeeRule**: 수용비 규칙
- ✅ **note**: 비고
- ✅ **status**: 과목 상태

**수정 불가능한 필드:**
- ❌ **termId**: 학기 정보 (과목 생성 후 변경 불가)
- ❌ **categoryId**: 분류 정보 (과목 생성 후 변경 불가)
- ❌ **schoolId**: 학교 정보 (과목 생성 후 변경 불가)
- ❌ **groups**: 반 정보 (별도 API 사용)

**비즈니스 규칙:**
- ✅ 과목명은 같은 학기 내에서 고유해야 함
- ✅ 수업 기간은 해당 학기 범위 내에 있어야 함
- ✅ 수업료 구성의 합계가 맞아야 함
- ✅ 진행 중인 과목의 주요 정보 변경 시 주의 필요
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 과목의 고유 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateLessonDto,
      examples: {
        nameOnly: {
          summary: '과목명만 수정',
          description: '과목명만 변경하는 경우',
          value: {
            lessonName: '초등 영어 A+ (개선반)',
          },
        },
        periodUpdate: {
          summary: '수업 기간 수정',
          description: '수업 시작일과 종료일 변경',
          value: {
            start: '2025-02-15',
            end: '2025-06-15',
            note: '수업 기간 1주 연장',
          },
        },
        feeUpdate: {
          summary: '수업료 정보 수정',
          description: '수업료 구성 요소 업데이트',
          value: {
            total: 180000,
            instructorFee: 120000,
            bookFees: [
              { name: '신교재비', amount: 35000 },
              { name: '워크북', amount: 15000 },
            ],
            operationFee: 10000,
            note: '교재 변경으로 인한 수업료 조정',
          },
        },
        statusUpdate: {
          summary: '과목 상태 변경',
          description: '과목 진행 상태 업데이트',
          value: {
            status: 'ACTIVE',
            note: '수강생 모집 완료로 활성화',
          },
        },
        comprehensive: {
          summary: '종합 업데이트',
          description: '여러 필드를 동시에 수정',
          value: {
            lessonName: '초등 영어 심화반',
            description: '영어 실력 향상을 위한 심화 과정',
            frequency: 2,
            total: 200000,
            instructorFee: 140000,
            materialFees: [{ name: '교구비', amount: 20000 }],
            operationFee: 40000,
            status: 'ACTIVE',
            note: '프로그램 개선으로 인한 업그레이드',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '과목 정보 수정 성공',
      type: Lesson,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.CONFLICT,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ============================================================================ ?//
//? Update Lesson Days
//? ============================================================================ ?//

export const UpdateLessonDaysDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 수업일 자동 생성',
      description: `
### 📅 과목 수업일 자동 생성 및 업데이트

**기능 개요:**
- 과목의 기간(start~end)과 그룹의 요일/시간 정보를 기준으로 수업일을 자동 생성합니다
- 기존 수업일이 있으면 업데이트하고, 없으면 새로 생성합니다

**생성 로직:**
1. **기간 계산**: 과목 시작일부터 종료일까지
2. **요일 매칭**: 각 그룹의 설정된 요일과 일치하는 날짜 찾기
3. **휴일 제외**: 학교 캘린더의 휴일 정보 반영
4. **시간 설정**: 그룹별 수업 시작/종료 시간 적용

**휴일 처리:**
- ✅ 학교 캘린더의 휴일 정보 확인
- ✅ 휴일에 해당하는 수업일은 비활성화 상태로 생성
- ✅ 공휴일, 방학, 시험 기간 등 자동 반영

**생성 결과:**
- 각 그룹별로 수업일 생성
- 전체 생성된 수업일 수를 반환
- 중복 방지 및 기존 데이터 보호

**사용 시나리오:**
- 과목 생성 후 수업 일정 자동 생성
- 과목 기간 변경 후 수업일 재생성
- 그룹 요일 변경 후 일정 업데이트
- 캘린더 업데이트 후 휴일 반영

**주의사항:**
- 기존에 출석 데이터가 있는 수업일은 보존됩니다
- 수업일 변경이 학생/학부모에게 알림이 갈 수 있습니다
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수업일을 생성할 과목의 고유 ID',
      example: 1,
    }),
    ApiOkResponse({
      description: '수업일 자동 생성 완료',
      schema: {
        type: 'number',
        description: '생성된 전체 수업일 수',
        example: 48,
      },
      examples: {
        success: {
          summary: '성공적 생성 - 48개의 수업일이 생성됨',
          value: 48,
        },
        noGroup: {
          summary: '그룹 없음 - 그룹이 없어서 생성된 수업일이 없음',
          value: 0,
        },
        partialGeneration: {
          summary: '부분 생성 - 일부 그룹만 수업일 생성됨',
          value: 24,
        },
      },
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ============================================================================ ?//
//? Remove Lesson
//? ============================================================================ ?//

export const RemoveLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 과목 삭제',
      description: `
### 🗑️ 과목 완전 삭제

**기능 개요:**
- 과목과 관련된 모든 데이터를 완전히 삭제합니다
- 연관된 반, 수강생, 수업일 등의 정보도 함께 제거됩니다

**삭제되는 데이터:**
- ✅ **Lesson**: 과목 정보
- ✅ **Groups**: 과목에 속한 모든 반
- ✅ **Picks**: 확정 수강생 정보
- ✅ **Schooldays**: 생성된 수업일
- ✅ **Contracts**: 수강 계약 정보
- ✅ **Attendances**: 출석 기록 (DynamoDB)

**삭제 조건 및 제약:**
- ⚠️ **진행 중인 과목**: 활성 상태의 과목 삭제 시 추가 확인 필요
- ⚠️ **수강생 존재**: 확정 수강생이 있는 경우 주의 필요
- ⚠️ **결제 완료**: 결제가 완료된 계약이 있는 경우 환불 처리 필요
- ⚠️ **출석 기록**: 출석 데이터가 있는 경우 백업 고려

**삭제 순서:**
1. 출석 기록 삭제 (DynamoDB)
2. 수업일 삭제
3. 확정 수강생 삭제
4. 계약 정보 삭제
5. 반 정보 삭제
6. 과목 삭제

**복구 불가능:**
- ❌ 삭제된 데이터는 복구할 수 없습니다
- ❌ 연관된 모든 정보가 영구적으로 제거됩니다

**사용 시나리오:**
- 취소된 과목 정리
- 잘못 생성된 과목 제거
- 학기 종료 후 데이터 정리
- 시스템 정리 및 최적화
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 과목의 고유 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '과목 삭제 성공 (삭제된 과목 정보 반환)',
      type: Lesson,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.CONFLICT,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};
