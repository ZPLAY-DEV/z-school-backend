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

export const CreateSchoolTermOfferingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🎯 학기별 수강신청과목 일괄 생성',
      description:
        '학기의 모든 과목과 반 정보를 조합하여 수강신청과목을 일괄 생성합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
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

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingPaginatedListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📊 학기별 수강신청과목 페이지네이션 목록',
      description:
        '수강신청과목 목록을 페이지네이션으로 조회합니다 (검색: lessonName/groupName, 필터: pickRule/allowedGrades, 정렬: id/lessonName/groupName).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiPaginationQuery(SCHOOL_TERM_OFFERING_CONFIG),
    ApiOkPaginatedResponse(Offering, SCHOOL_TERM_OFFERING_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📋 학기별 수강신청과목 전체 목록',
      description:
        '수강신청과목 전체 목록을 조회합니다 (필터: grade/categoryId/weekday).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiQuery({
      name: 'grade',
      type: Number,
      description: '학년 필터 (선택)',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'categoryId',
      type: Number,
      description: '카테고리 ID 필터 (선택)',
      required: false,
      example: 5,
    }),
    ApiQuery({
      name: 'weekday',
      type: String,
      description: '요일 필터 (선택)',
      required: false,
      example: '월',
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 전체 목록 조회 완료',
      type: Offering,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings Personal List
//? ---------------------------------------------------------------------- ?//

export const GetPersonalListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 학생별 개인화된 수강신청과목 목록',
      description:
        '학생별로 개인화된 수강신청과목 목록을 조회합니다 (학년 필터링, 시간표 충돌 체크, booking 정보 포함).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiQuery({
      name: 'studentId',
      type: Number,
      description: '학생 ID (필수)',
      required: true,
      example: 789,
    }),
    ApiQuery({
      name: 'grade',
      type: Number,
      description: '학년 (필수)',
      required: true,
      example: 1,
    }),
    ApiQuery({
      name: 'categoryId',
      type: Number,
      description: '카테고리 ID (선택)',
      required: false,
      example: 10,
    }),
    ApiQuery({
      name: 'booking',
      type: Boolean,
      description: '수강신청 여부 필터 (선택)',
      required: false,
      example: false,
    }),
    ApiQuery({
      name: 'weekday',
      type: Boolean,
      description: '요일 정보 포함 여부 (선택)',
      required: false,
      example: true,
    }),
    ApiOkResponseTemplate({
      description: '학생별 개인화된 수강신청과목 목록 조회 완료',
      type: ResponseSchoolOfferingListDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Delete School > Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermOfferingsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🗑️ 학기별 수강신청과목 전체 삭제',
      description:
        '학기의 모든 수강신청과목을 삭제합니다 (연관된 수강신청도 함께 삭제).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiOkResponse({
      description: '수강신청과목 전체 삭제 완료',
      schema: {
        type: 'number',
        description: '삭제된 수강신청과목 수',
        example: 42,
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get My Offerings List
//? ---------------------------------------------------------------------- ?//

export const GetMyOfferingsListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 내 수강신청과목 목록 조회',
      description: '학생의 수강신청과목 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiQuery({
      name: 'studentId',
      type: Number,
      description: '학생 ID (필수)',
      required: true,
      example: 789,
    }),
    ApiOkResponseTemplate({
      description: '내 수강신청과목 목록 조회 완료',
      type: Offering,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Get My Offerings Paginated List
//? ---------------------------------------------------------------------- ?//

export const GetMyOfferingsPaginatedListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👤 내 수강신청과목 페이지네이션 목록',
      description:
        '학생의 수강신청과목 목록을 페이지네이션으로 조회합니다 (검색, 정렬 지원).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
    }),
    ApiQuery({
      name: 'studentId',
      type: Number,
      description: '학생 ID (필수)',
      required: true,
      example: 789,
    }),
    ApiPaginationQuery(SCHOOL_TERM_OFFERING_CONFIG),
    ApiOkPaginatedResponse(Offering, SCHOOL_TERM_OFFERING_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
