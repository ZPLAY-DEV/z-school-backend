import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';

const SCHOOL_NEWSLETTER_CONFIG: PaginateConfig<Newsletter> = {
  sortableColumns: ['id', 'createdAt'],
  searchableColumns: ['title', 'body'],
  defaultSortBy: [['id', 'ASC']],
  filterableColumns: {
    type: [FilterOperator.EQ, FilterOperator.IN],
    status: [FilterOperator.EQ, FilterOperator.IN],
  },
};

//? ---------------------------------------------------------------------- ?//
//? List School Term Newsletters
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 뉴스레터 목록 조회',
      description:
        '특정 학교의 뉴스레터 목록을 조회합니다. termId로 특정 학기만 필터링 가능합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항)',
      required: false,
      example: 1,
    }),
    ApiExtraModels(Newsletter),
    ApiOkResponse({
      description: '뉴스레터 목록 조회 성공',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Newsletter) },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Infinite List School Term Newsletters
//? ---------------------------------------------------------------------- ?//

export const InfiniteListSchoolTermNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 뉴스레터 페이지네이션 조회',
      description:
        '특정 학교의 뉴스레터를 페이지네이션으로 조회합니다. termId로 특정 학기만 필터링하고, title과 body에서 검색 가능합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (선택사항)',
      required: false,
      example: 1,
    }),
    ApiPaginationQuery(SCHOOL_NEWSLETTER_CONFIG),
    ApiOkPaginatedResponse(Newsletter, SCHOOL_NEWSLETTER_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
