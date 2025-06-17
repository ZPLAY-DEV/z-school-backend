import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateLessonDto } from 'src/domain/lesson/dto/create-lesson.dto';
import { Lesson } from '../entities/lesson.entity';

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
      summary: '학교 > 학기 > 과목 👈 bulk 생성',
      description: `
      - 특정 학기에 속한 과목 일괄 생성
      - 여러 과목을 한 번에 생성할 수 있습니다
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
      isArray: true,
      description: '생성할 과목 목록',
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
      summary: '학교 > 학기 > 과목 👈 bulk 생성 (dryrun)',
      description: `
      - 특정 학기에 속한 과목 일괄 생성 시뮬레이션
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인
      - 중복 강좌 레코드 체크
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
      isArray: true,
      description: '생성할 과목 목록',
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
      summary: '학교 > 학기 > 과목 👈 리스트 (paginated)',
      description: `
      - 특정 학기에 속한 모든 과목의 페이지네이션 리스트
      - 정렬, 필터링, 검색 기능 제공
      `,
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
      summary: '학교 > 학기 > 과목 👈 리스트 (all)',
      description: `
      - 특정 학기에 속한 모든 과목의 전체 리스트
      `,
    }),
    ApiOkResponseTemplate({
      description: '과목 리스트 조회 완료',
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
      summary: '학교 > 학기 > 과목 👈 bulk 삭제',
      description: `
      - 특정 학기에 속한 모든 과목을 삭제
      - 삭제된 과목의 수를 반환
      `,
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
