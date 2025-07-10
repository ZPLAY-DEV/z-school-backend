import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Lesson } from '../../lesson/entities/lesson.entity';

const TERM_LESSON_CONFIG: PaginateConfig<Lesson> = {
  sortableColumns: ['id', 'lessonName'],
  searchableColumns: ['lessonName'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    grade: true,
    semester: true,
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lessons (Bulk)
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermLessonsBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🈵 학기별 과목 일괄 생성',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 여러 과목을 한 번에 생성합니다. 각 과목마다 강사 정보와 그룹 정보를 포함하여 완전한 과목 구조를 설정할 수 있습니다.

**🔄 비즈니스 로직**
- 학기별로 과목 정보를 일괄 등록
- 과목명은 동일 학기 내에서 유니크해야 함
- 각 과목마다 강사와 그룹(반) 정보 자동 연결
- 수업료, 교재비, 재료비, 운영비 등 상세 비용 정보 설정
- 과목 상태는 기본적으로 PENDING으로 시작

**⚠️ 중요 제약사항**
- schoolId와 termId는 유효한 값이어야 함
- 동일 학기 내 과목명 중복 불가
- 강사 정보는 필수이며, 최소 1개 그룹 필요
- 수업 시간과 장소는 다른 과목과 겹치지 않아야 함

**📚 예시 시나리오**
- 초등학교 1학기 전체 과목 등록
- 방과후 특별활동 과목 일괄 추가
- 새 학기 준비를 위한 과목 설정
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      type: 'number',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      type: 'number',
      example: 1,
    }),
    ApiBody({
      description:
        '생성할 과목 목록 (schoolId, termId는 URL 파라미터에서 자동 설정)',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categoryId: { type: 'number', example: 1 },
            lessonName: { type: 'string', example: '초등 영어 A반' },
            description: { type: 'string', example: '기초 영어 회화 수업' },
            start: { type: 'string', example: '2025-03-01' },
            end: { type: 'string', example: '2025-06-30' },
            frequency: { type: 'number', example: 2 },
            total: { type: 'number', example: 50000 },
            instructorFee: { type: 'number', example: 30000 },
            operationFee: { type: 'number', example: 2000 },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  instructorName: { type: 'string', example: '김영희' },
                  instructorPhone: { type: 'string', example: '01012345678' },
                  groupName: { type: 'string', example: '영어 A반' },
                  location: { type: 'string', example: '202호' },
                  capacity: { type: 'number', example: 15 },
                  allowedGrades: { type: 'string', example: '1~2' },
                  weekday: { type: 'string', example: '월' },
                  start: { type: 'string', example: '14:00' },
                  end: { type: 'string', example: '15:00' },
                },
              },
            },
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '과목 일괄 생성 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lessons (Bulk DryRun)
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermLessonsBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 학기별 과목 일괄 생성 시뮬레이션',
      description: `
**📝 기능 설명**
실제 데이터를 생성하지 않고 과목 일괄 생성 과정을 시뮬레이션합니다. 데이터 검증, 중복 체크, 충돌 확인 등을 수행하여 실제 생성 전에 문제점을 미리 파악할 수 있습니다.

**🔄 비즈니스 로직**
- 모든 생성 로직을 실행하되 실제 저장은 하지 않음
- 과목명 중복 여부 검사
- 강사 스케줄 충돌 검사
- 교실 사용 시간 중복 검사
- 필수 데이터 유효성 검증

**⚠️ 중요 제약사항**
- 시뮬레이션 결과는 실제 생성과 동일한 검증 로직 적용
- 동시성 문제로 실제 생성 시 다른 결과가 나올 수 있음
- 중복 검사는 현재 시점 기준으로 수행

**📚 예시 시나리오**
- 대량 과목 등록 전 사전 검증
- 엑셀 파일로 받은 과목 정보 검증
- 기존 과목과의 충돌 여부 확인
- 강사 배정 가능성 검토
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      type: 'number',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      type: 'number',
      example: 1,
    }),
    ApiBody({
      description: '검증할 과목 목록',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categoryId: { type: 'number', example: 1 },
            lessonName: { type: 'string', example: '기존과목명' },
            description: {
              type: 'string',
              example: '이미 존재하는 과목명 테스트',
            },
            start: { type: 'string', example: '2025-03-01' },
            end: { type: 'string', example: '2025-06-30' },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  instructorName: { type: 'string', example: '김테스트' },
                  instructorPhone: { type: 'string', example: '01099999999' },
                  groupName: { type: 'string', example: '테스트반' },
                  location: { type: 'string', example: '테스트실' },
                  capacity: { type: 'number', example: 10 },
                  allowedGrades: { type: 'string', example: '1~3' },
                  weekday: { type: 'string', example: '목' },
                  start: { type: 'string', example: '14:00' },
                  end: { type: 'string', example: '15:00' },
                },
              },
            },
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '과목 일괄 생성 시뮬레이션 결과',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Lessons Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥📄 학기별 과목 페이지네이션 목록',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 등록된 모든 과목을 페이지네이션 형태로 조회합니다. 검색, 필터링, 정렬 기능을 제공하여 효율적인 과목 관리가 가능합니다.

**🔄 비즈니스 로직**
- 학기별 과목 목록을 페이지 단위로 조회
- 과목명으로 검색 가능
- 학년별, 학기별 필터링 지원
- 과목 ID, 과목명으로 정렬 가능
- 기본적으로 최신 등록순으로 정렬

**⚠️ 중요 제약사항**
- Public 엔드포인트로 인증 불필요
- 페이지 크기는 시스템 설정에 따라 제한
- 검색어는 부분 일치로 동작

**📚 예시 시나리오**
- 학기별 전체 과목 브라우징
- 특정 과목명으로 빠른 검색
- 학년별 과목 필터링
- 과목 등록 현황 파악
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      type: 'number',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      type: 'number',
      example: 1,
    }),
    ApiQuery({
      name: 'search',
      description: '과목명 검색어',
      required: false,
      type: 'string',
      example: '영어',
    }),
    ApiQuery({
      name: 'filter.grade',
      description: '학년 필터',
      required: false,
      type: 'string',
      example: '1~2',
    }),
    ApiQuery({
      name: 'filter.semester',
      description: '학기 필터',
      required: false,
      type: 'number',
      example: 1,
    }),
    ApiQuery({
      name: 'sortBy',
      description: '정렬 기준 (id, lessonName)',
      required: false,
      type: 'string',
      example: 'lessonName:ASC',
    }),
    ApiPaginationQuery(TERM_LESSON_CONFIG),
    ApiOkPaginatedResponse(Lesson, TERM_LESSON_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Lessons List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학기별 전체 과목 목록',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 등록된 모든 과목을 한 번에 조회합니다. 페이지네이션 없이 전체 과목 목록을 제공하므로 드롭다운, 선택 목록 등에 활용할 수 있습니다.

**🔄 비즈니스 로직**
- 해당 학기의 모든 과목을 일괄 조회
- 과목 등록순으로 정렬
- 활성 상태와 관계없이 모든 과목 포함
- 과목별 기본 정보만 제공

**⚠️ 중요 제약사항**
- Public 엔드포인트로 인증 불필요
- 과목 수가 많을 경우 응답 시간이 길어질 수 있음
- 상세 정보는 포함되지 않음 (그룹, 강사 정보 제외)

**📚 예시 시나리오**
- 수강신청 시 과목 선택 목록
- 과목별 통계 생성용 전체 목록
- 관리자 화면 과목 드롭다운
- 학기별 과목 현황 보고서
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      type: 'number',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      type: 'number',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '과목 전체 목록 조회 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete School > Term > Lessons
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermLessonsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 학기별 모든 과목 삭제',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 등록된 모든 과목을 일괄 삭제합니다. 관련된 그룹, 강사 배정, 수강신청 정보도 함께 정리됩니다.

**🔄 비즈니스 로직**
- 해당 학기의 모든 과목을 일괄 삭제
- 관련된 그룹(반) 정보도 함께 삭제
- 수강신청 정보가 있는 경우 삭제 제한 가능
- 삭제된 과목 수를 반환하여 결과 확인 가능

**⚠️ 중요 제약사항**
- 돌이킬 수 없는 작업이므로 신중하게 사용
- 수강생이 있는 과목은 삭제 제한될 수 있음
- 결제 정보가 연결된 과목은 별도 처리 필요
- 관리자 권한 필요 (인증 토큰 확인)

**📚 예시 시나리오**
- 학기 종료 후 데이터 정리
- 잘못 등록된 학기 과목 일괄 삭제
- 새 학기 준비를 위한 기존 과목 정리
- 테스트 데이터 초기화
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      type: 'number',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      type: 'number',
      example: 1,
    }),
    ApiOkResponse({
      description: '과목 전체 삭제 완료',
      schema: {
        type: 'number',
        example: 15,
        description: '삭제된 과목의 수',
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
