import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
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

export const SchoolTermLessonsCreateBulkDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🈵 학기별 과목 일괄 생성',
      description:
        '학기별 과목을 일괄 생성합니다 (Upsert 방식: 과목명 기준 중복 체크).',
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
    ApiBody({
      description: '생성할 과목 목록',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          description: 'CreateLessonRequestDto',
        },
      },
    }),
    ApiOkResponse({
      description: '과목 일괄 생성 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 과목 수',
        example: 12,
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lessons (Bulk DryRun)
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsCreateBulkDryrunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 학기별 과목 일괄 생성 시뮬레이션',
      description:
        '과목 일괄 생성을 시뮬레이션합니다 (DB 변경 없이 중복 과목 정보만 반환).',
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
    ApiBody({
      description: '시뮬레이션할 과목 목록',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          description: 'CreateLessonRequestDto',
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '중복 과목 시뮬레이션 결과',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Lessons Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥📄 학기별 과목 페이지네이션 목록',
      description:
        '학기별 과목 목록을 페이지네이션으로 조회합니다 (검색: lessonName, 필터: grade/semester, 정렬: id/lessonName).',
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
    ApiPaginationQuery(TERM_LESSON_CONFIG),
    ApiOkPaginatedResponse(Lesson, TERM_LESSON_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Lessons List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👥 학기별 전체 과목 목록',
      description: '학기별 모든 과목 목록을 조회합니다.',
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
    ApiOkResponseTemplate({
      description: '과목 전체 목록 조회 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Delete School > Term > Lessons
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsDeleteAllDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 학기별 모든 과목 삭제',
      description:
        '학기의 모든 과목을 삭제합니다 (연관된 그룹, 수강신청도 함께 삭제).',
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
    ApiOkResponse({
      description: '과목 전체 삭제 완료',
      schema: {
        type: 'number',
        description: '삭제된 과목 수',
        example: 15,
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Upload School Term Lessons Excel
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsUploadExcelDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📊 Excel 파일로 과목 일괄 등록',
      description: 'Excel 파일을 업로드하여 과목 정보를 일괄 등록/수정합니다.',
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
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Excel 파일 (.xlsx)',
          },
        },
        required: ['file'],
      },
    }),
    ApiOkResponse({
      description: '과목 일괄 등록 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 과목 수',
        example: 12,
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Download School Term Lessons Excel
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonsDownloadExcelDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📥 과목 목록 Excel 파일 다운로드',
      description: '학기의 과목 목록을 Excel 파일로 다운로드합니다.',
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
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOkResponse({
      description: 'Excel 파일 다운로드 완료',
      schema: {
        type: 'string',
        format: 'binary',
        description: 'Excel 파일 (.xlsx)',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
