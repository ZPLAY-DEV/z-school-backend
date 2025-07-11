import { applyDecorators } from '@nestjs/common';
import {
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
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';

const SCHOOLDAY_PAGINATE_CONFIG: PaginateConfig<Schoolday> = {
  relations: {
    group: true,
  },
  sortableColumns: ['id', 'startsAt', 'endsAt'],
  defaultSortBy: [['startsAt', 'ASC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE],
    'group.groupName': [FilterOperator.ILIKE],
  },
};

// List Schooldays
export const ListSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 특정 학교/학기의 수업일 목록 조회',
      description: `
**📝 기능 설명**
- 지정된 학교와 학기의 수업일 목록을 조회합니다
- 특정 날짜 기준으로 필터링하거나 전체 목록을 조회할 수 있습니다
- 각 수업일의 그룹(반) 정보가 함께 포함됩니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학교/학기 필터링
2. date 파라미터가 있으면 해당 날짜의 수업일만 조회
3. date 파라미터가 없으면 전체 수업일 목록 조회
4. 수업 시작시간 기준으로 오름차순 정렬

**📊 응답 데이터**
- Schoolday 정보 (수업일 기본 정보, 시간, 비고 등)
- Group 정보 (반 이름, 장소, 강사 등)

**🔍 활용 예시**
- 특정 날짜의 수업 일정 확인
- 학기 전체 수업 일정 조회
- 강사별 수업 스케줄 관리
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
      name: 'date',
      description: '조회할 날짜 (YYYY-MM-DD 형식, 선택사항)',
      type: 'string',
      required: false,
      example: '2025-01-15',
    }),
    ApiOkResponse({
      description: '수업일 목록 조회 성공',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            schoolId: { type: 'number', example: 1 },
            termId: { type: 'number', example: 1 },
            lessonId: { type: 'number', example: 1 },
            groupId: { type: 'number', example: 1 },
            name: { type: 'string', example: '수학A반' },
            startsAt: { type: 'string', example: '2025-01-15T14:00:00.000Z' },
            endsAt: { type: 'string', example: '2025-01-15T15:00:00.000Z' },
            duration: { type: 'number', example: 60 },
            updatedBy: { type: 'string', example: 'MANAGER', nullable: true },
            note: { type: 'string', example: '정상 수업', nullable: true },
            group: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                groupName: { type: 'string', example: '수학A반' },
                samName: { type: 'string', example: '김선생' },
                location: { type: 'string', example: '수학교실' },
                capacity: { type: 'number', example: 20 },
                weekday: { type: 'string', example: 'MONDAY' },
                start: { type: 'string', example: '14:00' },
                end: { type: 'string', example: '15:00' },
                status: { type: 'string', example: 'OPEN' },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 날짜 형식',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: '날짜는 YYYY-MM-DD 형식이어야 합니다.',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

// Paginated List Schooldays
export const PaginatedListSchooldaysDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📅 특정 학교/학기의 수업일 목록 조회 (페이지네이션)',
      description: `
**📝 기능 설명**
- 지정된 학교와 학기의 수업일 목록을 페이지네이션으로 조회합니다
- 검색, 필터링, 정렬 기능을 지원합니다
- 대량의 수업일 데이터를 효율적으로 처리할 수 있습니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학교/학기 필터링
2. date 파라미터가 있으면 해당 날짜의 수업일만 조회
3. 페이지네이션 파라미터로 결과 수 제한
4. 검색 및 필터링 기능 제공

**🔍 검색 및 필터링**
- name: 수업 이름으로 검색 (부분 일치)
- group.groupName: 반 이름으로 검색 (부분 일치)
- 정렬: id, startsAt, endsAt 기준 정렬 가능

**📊 응답 데이터**
- 페이지네이션 메타데이터 (총 개수, 페이지 정보)
- Schoolday 정보 배열 (수업일 기본 정보, 시간, 비고 등)
- Group 정보 (반 이름, 장소, 강사 등)

**🔍 활용 예시**
- 대량의 수업일 데이터 관리
- 수업 일정 검색 및 필터링
- 관리자 대시보드에서 수업 현황 확인
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
      name: 'date',
      description: '조회할 날짜 (YYYY-MM-DD 형식, 선택사항)',
      type: 'string',
      required: false,
      example: '2025-01-15',
    }),
    ApiPaginationQuery(SCHOOLDAY_PAGINATE_CONFIG),
    ApiOkPaginatedResponse(Schoolday, SCHOOLDAY_PAGINATE_CONFIG),
    ApiResponse({
      status: 400,
      description: '잘못된 날짜 형식',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: '날짜는 YYYY-MM-DD 형식이어야 합니다.',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
