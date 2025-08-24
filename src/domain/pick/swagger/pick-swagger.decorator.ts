import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
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
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { EndPickDto, StartPickDto } from '../dto/create-pick.dto';
import { UpdatePickDto } from '../dto/update-pick.dto';
import { Pick } from '../entities/pick.entity';

const LIST_STUDENTS_CONFIG: PaginateConfig<Pick> = {
  relations: {
    student: {
      parent: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    enrolledBy: [FilterOperator.EQ],
    deletedBy: [FilterOperator.EQ],
  },
};

const LIST_GROUPS_CONFIG: PaginateConfig<Pick> = {
  relations: {
    group: {
      lesson: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    enrolledBy: [FilterOperator.EQ],
    deletedBy: [FilterOperator.EQ],
  },
};

// StartPick
export const StartPickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🟢 학생 반 등록 시작 (중간 편입)',
      description: `
**📝 기능 설명**
- 중간에 반에 참여하는 학생을 등록합니다
- 수업시작일을 기록하여 해당 날짜부터 출석체크가 시작됩니다
- 시간 충돌이 있는 경우 422 error와 함께 충돌하는 학생 이름들을 반환합니다

**🔄 비즈니스 로직**
1. 배열 형태로 여러 학생을 한 번에 등록 가능
2. startedBy는 현재 로그인한 사용자의 role로 자동 설정됨
3. end 날짜는 그룹의 lesson.end 또는 lesson.term.end로 자동 설정됨
4. termId가 없으면 그룹의 lesson.termId로 자동 설정됨
5. 기존 Pick이 있으면 이력에 JOIN 이벤트 추가하며 업데이트, 없으면 새로 생성
6. 시간 충돌 검증: 같은 학기의 다른 그룹과 시간이 겹치는지 확인

**⚠️ 중요 제약사항**
- groupId와 studentId 조합은 유니크해야 함
- start 날짜는 lesson의 시작일 이후여야 함
- 날짜는 반드시 YYYY-MM-DD 형식
- 강사의 경우 editPickPermission이 있어야 함

**📚 예시 시나리오**
- 전학생이 3월 15일부터 수학 수업에 참여
- 비고에 "중간 전학으로 인한 편입" 기록
- 시간 충돌 시 해당 학생명과 함께 422 에러 반환
      `,
    }),
    ApiBody({
      type: [StartPickDto],
      description: '학생 반 등록 시작 데이터 배열',
      examples: {
        singleStudent: {
          summary: '단일 학생 등록',
          value: [
            {
              groupId: 1,
              studentId: 123,
              offeringId: 1,
              termId: 1,
              startedBy: 'MANAGER',
              start: '2025-03-15',
              note: '중간 전학으로 인한 반 편입',
            },
          ],
        },
        multipleStudents: {
          summary: '여러 학생 동시 등록',
          value: [
            {
              groupId: 1,
              studentId: 123,
              offeringId: 1,
              termId: 1,
              startedBy: 'MANAGER',
              start: '2025-03-15',
              note: '중간 전학으로 인한 반 편입',
            },
            {
              groupId: 1,
              studentId: 124,
              offeringId: 1,
              termId: 1,
              startedBy: 'INSTRUCTOR',
              start: '2025-03-20',
              note: '재수강 신청',
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: '학생 반 등록 완료 - 처리된 학생 수 반환',
      schema: {
        type: 'number',
        example: 2,
        description: '성공적으로 등록/업데이트된 학생 수',
      },
    }),
    ApiResponse({
      status: 400,
      description: '요청 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              '반 ID는 1 이상이어야 합니다',
              '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
              'dtos is empty',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 - 강사의 경우 editPickPermission 필요',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: {
            type: 'string',
            example: 'You are not allowed to edit student',
          },
          error: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '존재하지 않는 리소스',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example: 'Student with id 123 not found',
            description: 'Group, Student, SAM entity 등이 없을 때',
          },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 422,
      description: '시간 충돌 - 학생이 다른 그룹과 시간이 겹침',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 422 },
          message: {
            type: 'string',
            example: '김철수, 이영희',
            description: '시간 충돌이 있는 학생들의 이름 (쉼표로 구분)',
          },
          error: { type: 'string', example: 'Unprocessable Entity' },
        },
      },
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );

// EndPick
export const EndPickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔴 학생 반 등록 종료 (중간 퇴원)',
      description: `
**📝 기능 설명**
- 중간에 반에서 나가는 학생의 마지막 수업일을 기록합니다
- 해당 날짜 이후로는 출석체크가 중단됩니다
- Pick 상태를 비활성화(isActive: false)하여 수강 이력을 보존합니다

**🔄 비즈니스 로직**
1. endedBy는 컨트롤러에서 현재 로그인한 사용자의 role로 자동 설정됨
2. 기존 Pick 레코드를 찾아서 종료 정보만 업데이트
3. isActive를 false로 변경하고 history에 CANCEL 이벤트 추가
4. 완전 삭제가 아닌 종료 처리로 이력 보존

**⚠️ 중요 제약사항**
- 해당 groupId, studentId 조합의 Pick이 존재해야 함
- end 날짜는 YYYY-MM-DD 형식이어야 함
- endedBy 필드는 필수

**📚 예시 시나리오**
- 이사로 인해 7월 20일 마지막 수업 참여
- 비고에 "이사로 인한 수강 중단" 기록
- 매니저가 처리하여 endedBy는 MANAGER로 설정
      `,
    }),
    ApiBody({
      type: EndPickDto,
      description: '학생 반 등록 종료 데이터',
      examples: {
        default: {
          summary: '학생 수강 종료',
          value: {
            groupId: 1,
            studentId: 123,
            endedBy: 'MANAGER',
            end: '2025-07-20',
            note: '이사로 인한 수강 중단',
          },
        },
        withMinimumFields: {
          summary: '최소 필드로 종료',
          value: {
            groupId: 1,
            studentId: 123,
            endedBy: 'INSTRUCTOR',
            end: '2025-07-20',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '반 수강생 수업 종료 완료 - 업데이트된 Pick 정보 반환',
      type: Pick,
    }),
    ApiResponse({
      status: 404,
      description: '해당 조건의 Pick을 찾을 수 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'pick entity not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// RestartPick - 종료된 Pick을 다시 시작
export const RestartPickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔄 확정수강생 재시작',
      description: `
**📝 기능 설명**
- 이전에 종료(end)된 Pick을 다시 활성화하여 수강을 재개합니다
- 새로운 시작일로 수강을 재시작할 수 있습니다
- history에 새로운 JOIN 이벤트가 추가됩니다

**🔄 비즈니스 로직**
1. 기존 Pick 레코드를 찾아서 활성화 상태로 변경
2. isActive를 true로 설정하고 endedBy 필드를 null로 초기화
3. 새로운 start 날짜와 startedBy 정보로 업데이트
4. end 날짜는 그룹의 lesson.end 또는 lesson.term.end로 재설정
5. history에 JOIN 이벤트 추가하여 재시작 이력 기록
6. note 필드도 업데이트 가능

**⚠️ 중요 제약사항**
- 해당 groupId, studentId 조합의 Pick이 존재해야 함
- start 날짜는 YYYY-MM-DD 형식이어야 함
- startedBy 필드는 필수

**🌐 API 엔드포인트**
- POST /picks/restart

**📚 예시 시나리오**
- 이사 취소로 인해 수강 재개
- 일시적 수강 중단 후 복귀
- 학기 중 재등록
- 잘못된 종료 처리 후 재활성화
      `,
    }),
    ApiBody({
      type: StartPickDto,
      description: '확정수강생 재시작 데이터',
      examples: {
        default: {
          summary: '수강 재시작',
          value: {
            groupId: 1,
            studentId: 123,
            startedBy: 'MANAGER',
            start: '2025-04-01',
            note: '이사 취소로 인한 수강 재개',
          },
        },
        withOptionalFields: {
          summary: '전체 필드로 재시작',
          value: {
            groupId: 1,
            studentId: 123,
            offeringId: 1,
            termId: 1,
            startedBy: 'INSTRUCTOR',
            start: '2025-04-15',
            note: '학기 중 재등록',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '반 수강생 재시작 완료 - 업데이트된 Pick 정보 반환',
      type: Pick,
    }),
    ApiResponse({
      status: 400,
      description: '요청 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
              'startedBy는 필수입니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '해당 조건의 Pick을 찾을 수 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'pick entity not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

// ListStudents - 특정 그룹의 학생 목록 조회
export const ListStudentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥 특정 그룹(반)의 수강생 목록 조회',
      description: `
**📝 기능 설명**
- 지정된 그룹(반)에 등록된 모든 학생의 목록을 조회합니다
- 학생과 학부모 정보가 함께 포함됩니다
- 현재 수강 중인 학생과 종료된 학생 모두 포함

**📊 응답 데이터**
- Pick 정보 (수강 시작일, 종료일, 비용 등)
- Student 정보 (학생 기본 정보)
- Parent 정보 (학부모 연락처 등)

**🔍 활용 예시**
- 출석부 생성을 위한 학생 목록
- 학급 관리용 수강생 현황
- 학부모 연락처 확인
      `,
    }),
    ApiOkResponseTemplate({
      description: '그룹의 학생 목록 조회 성공',
      type: Pick,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListStudents - 특정 그룹의 학생 목록 페이지네이션 조회
export const PaginatedListStudentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥📄 특정 그룹(반)의 수강생 목록 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 대량의 학생 데이터를 페이지네이션으로 효율적으로 조회합니다
- 정렬, 검색, 필터링 기능을 제공합니다

**🔍 검색 & 필터링**
- \`search\`: note 필드에서 키워드 검색
- \`filter.enrolledBy\`: 등록자 구분 필터 (MANAGER, INSTRUCTOR, OTHER)
- \`filter.deletedBy\`: 삭제자 구분 필터
- \`sortBy\`: id 기준 정렬 (기본값: id DESC)

**📊 쿼리 파라미터 예시**
- \`?page=1&limit=20\`: 첫 페이지, 20개씩
- \`?search=전학&sortBy=id:ASC\`: '전학' 키워드 검색, ID 오름차순
- \`?filter.enrolledBy=MANAGER\`: 매니저가 등록한 학생만
      `,
    }),
    ApiPaginationQuery(LIST_STUDENTS_CONFIG),
    ApiOkPaginatedResponse(Pick, LIST_STUDENTS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListGroups - 특정 학생의 그룹 목록 조회
export const ListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🎒 특정 학생의 수강 그룹(반) 목록 조회',
      description: `
**📝 기능 설명**
- 지정된 학생이 등록된 모든 그룹(반)의 목록을 조회합니다
- 그룹과 수업 정보가 함께 포함됩니다
- 현재 수강 중인 그룹과 종료된 그룹 모두 포함

**📊 응답 데이터**
- Pick 정보 (수강 기간, 비용 등)
- Group 정보 (반 이름, 정원 등)
- Lesson 정보 (수업명, 스케줄 등)

**🔍 활용 예시**
- 학생의 수강 이력 조회
- 시간표 생성을 위한 그룹 정보
- 수강료 계산을 위한 비용 정보
      `,
    }),
    ApiOkResponseTemplate({
      description: '학생의 그룹 목록 조회 성공',
      type: Pick,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListGroups - 특정 학생의 그룹 목록 페이지네이션 조회
export const PaginatedListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🎒📄 특정 학생의 수강 그룹(반) 목록 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 학생의 수강 이력이 많을 때 페이지네이션으로 효율적으로 조회합니다
- 정렬, 검색, 필터링 기능을 제공합니다

**🔍 검색 & 필터링**
- \`search\`: note 필드에서 키워드 검색
- \`filter.enrolledBy\`: 등록자 구분 필터
- \`filter.deletedBy\`: 삭제자 구분 필터
- \`sortBy\`: id 기준 정렬 (기본값: id DESC)

**📊 쿼리 파라미터 예시**
- \`?page=1&limit=10\`: 첫 페이지, 10개씩
- \`?search=수학&sortBy=id:DESC\`: '수학' 키워드 검색, 최신순
- \`?filter.enrolledBy=INSTRUCTOR\`: 강사가 등록한 수강 이력만
      `,
    }),
    ApiPaginationQuery(LIST_GROUPS_CONFIG),
    ApiOkPaginatedResponse(Pick, LIST_GROUPS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// UpdatePick
export const UpdatePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✏️ 확정수강생 정보 수정',
      description: `
**📝 기능 설명**
- 반에 등록된 특정 학생의 Pick 정보를 수정합니다
- 날짜, 등록자 정보, 비고 등 수정 가능한 필드만 업데이트

**🔄 비즈니스 로직**
- groupId, studentId, offeringId, termId는 수정 불가 (식별자이므로)
- 수정 가능 필드: startedBy, start, endedBy, end, note
- 부분 업데이트 지원 (변경할 필드만 전송)

**⚠️ 중요 제약사항**
- Pick ID로 특정 레코드를 찾아서 수정
- start 날짜는 end 날짜보다 이전이어야 함
- 날짜는 YYYY-MM-DD 형식 필수
- startedBy, endedBy는 유효한 Actor 값이어야 함

**📚 예시 시나리오**
- 수업시작일을 3월 15일에서 3월 20일로 연기
- 등록자 정보를 INSTRUCTOR에서 MANAGER로 변경
- 비고에 "학생 요청으로 인한 수정" 추가
      `,
    }),
    ApiBody({
      type: UpdatePickDto,
      description: '수정할 Pick 정보 (부분 업데이트)',
      examples: {
        updateNote: {
          summary: '비고 수정',
          value: {
            note: '특별 관리 대상 학생',
          },
        },
        updateDates: {
          summary: '수업 날짜 수정',
          value: {
            start: '2025-03-20',
            startedBy: 'MANAGER',
            note: '학생 요청으로 시작일 연기',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '반 수강생 정보 수정 완료 - 업데이트된 Pick 정보 반환',
      type: Pick,
    }),
    ApiResponse({
      status: 400,
      description: '요청 데이터 검증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              'startedBy는 유효한 Actor 값이어야 합니다',
              '수업시작일은 YYYY-MM-DD 형식이어야 합니다',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '해당 ID의 Pick을 찾을 수 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Pick not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

// DeletePick
export const DeletePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 확정수강생 삭제',
      description: `
**📝 기능 설명**
- 반에서 특정 학생을 완전히 삭제합니다
- Soft Delete 방식으로 실제 데이터는 보존됩니다

**🔄 비즈니스 로직**
- deletedAt 필드에 삭제 시간 기록
- 삭제된 Pick은 일반 조회에서 제외됨
- 완전한 데이터 복구 가능

**⚠️ 중요 제약사항**
- 이미 삭제된 Pick은 재삭제 불가
- 관련된 출석 데이터는 별도 처리 필요
- 삭제 권한 확인 필수

**📚 예시 시나리오**
- 잘못 등록된 학생을 반에서 제거
- 중복 등록된 Pick 레코드 정리
- 테스트 데이터 정리
      `,
    }),
    ApiOkResponse({
      description: '반 수강생 삭제 완료 - 삭제된 Pick 정보 반환',
      type: Pick,
    }),
    ApiResponse({
      status: 404,
      description: '해당 ID의 Pick을 찾을 수 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Pick not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
