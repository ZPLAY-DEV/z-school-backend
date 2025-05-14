import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateLessonResponseDto } from 'src/domain/lesson/dto/create-lesson-response.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { Lesson } from '../entities/lesson.entity';

const SCHOOL_TERM_LESSON_CONFIG: PaginateConfig<Lesson> = {
  sortableColumns: ['id', 'lessonName', 'termId'],
  defaultSortBy: [['id', 'DESC']],
  searchableColumns: ['schoolName', 'lessonName'],
  filterableColumns: {
    schoolName: true,
    lessonName: true,
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lesson Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermLessonBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 과목 👈 bulk 생성',
      description: `
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰면 됨.
      - 여러개 과목 생성 또는 업데이트 (CSV 로 전달시 사용)
      - 학교 아이디, 학기 아이디, 과목명 조합은 반드시 유니크 해야함.
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '여러 과목 일괄 등록 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List School > Term > Lesson
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 과목 👈 리스트 (all)',
      description: `
      - 학교의 특정 학기에 속한 모든 과목 전체 리스트
      `,
    }),
    ApiOkResponseTemplate({
      description: '과목 리스트 조회 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List School > Term > Lesson (paginated)
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonInfiniteListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 과목 👈 리스트 (paginated)',
      description: `
      - 학교의 특정 학기에 속한 모든 과목의 paginated list
      `,
    }),
    ApiPaginationQuery(SCHOOL_TERM_LESSON_CONFIG),
    ApiOkPaginatedResponse(CreateLessonResponseDto, SCHOOL_TERM_LESSON_CONFIG),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete All School > Term > Lessons
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermLessonsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 과목 👈 bulk 삭제',
      description: `
      - 학교의 특정 학기에 속한 모든 과목 삭제
      - 삭제된 과목의 수를 반환
      `,
    }),
    ApiOkResponse({
      description: '과목 전체 삭제 완료',
      schema: {
        type: 'number',
        example: 42,
        description: '삭제된 과목의 수',
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};
