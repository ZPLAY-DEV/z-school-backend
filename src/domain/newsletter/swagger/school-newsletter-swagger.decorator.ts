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
import { NewsletterType } from 'src/common/enums/newsletter-type';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';

const SCHOOL_NEWSLETTER_CONFIG: PaginateConfig<Newsletter> = {
  sortableColumns: ['id'],
  searchableColumns: ['title', 'body'],
  defaultSortBy: [['id', 'ASC']],
  filterableColumns: {
    type: [FilterOperator.EQ, FilterOperator.IN],
    mode: [FilterOperator.EQ, FilterOperator.IN],
  },
};

//? ---------------------------------------------------------------------- ?//
//? List School Term Newsletters
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 뉴스레터 목록 조회',
      description: `
      - 특정 학교의 뉴스레터 목록을 조회합니다.
      - termId가 제공되면 해당 학기의 뉴스레터만 필터링됩니다.
      - type이 제공되면 해당 유형의 뉴스레터만 필터링됩니다.
      - 뉴스레터 종류: REGISTRATION(수강신청), NEWS(공지사항), SURVEY(설문지)
      `,
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
      description: '학기 ID (선택사항) - 특정 학기의 뉴스레터만 조회',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'type',
      enum: NewsletterType,
      description:
        '뉴스레터 유형 (선택사항) - REGISTRATION(수강신청), NEWS(공지사항), SURVEY(설문지)',
      required: false,
      example: NewsletterType.NEWS,
    }),
    ApiExtraModels(Newsletter),
    ApiOkResponse({
      description: '학교 뉴스레터 목록 조회 완료',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Newsletter) },
        description: '조건에 맞는 뉴스레터 목록',
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
      summary: '학교 뉴스레터 페이지네이션 목록 조회',
      description: `
      - 특정 학교의 뉴스레터를 페이지네이션으로 조회합니다.
      - termId가 제공되면 해당 학기의 뉴스레터만 필터링됩니다.
      - type이 제공되면 해당 유형의 뉴스레터만 필터링됩니다.
      - 무한 스크롤 방식의 UI에서 사용할 수 있도록 페이지네이션을 지원합니다.
      - Query 파라미터를 통해 페이지 크기, 정렬 등을 설정할 수 있습니다.
      `,
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
      description: '학기 ID (선택사항) - 특정 학기의 뉴스레터만 조회',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'type',
      enum: NewsletterType,
      description:
        '뉴스레터 유형 (선택사항) - REGISTRATION(수강신청), NEWS(공지사항), SURVEY(설문지)',
      required: false,
      example: NewsletterType.NEWS,
    }),
    ApiPaginationQuery(SCHOOL_NEWSLETTER_CONFIG),
    ApiOkPaginatedResponse(Newsletter, SCHOOL_NEWSLETTER_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
