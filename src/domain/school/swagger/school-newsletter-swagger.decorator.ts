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
      summary: '🏫 학교 뉴스레터 목록 조회',
      description: `
**📝 기능 설명**
- 특정 학교의 뉴스레터 목록을 조회합니다
- 학기별, 타입별 필터링을 지원합니다
- ID 오름차순으로 정렬하여 시간순 조회가 가능합니다

**🔄 비즈니스 로직**
1. schoolId로 해당 학교의 뉴스레터 조회
2. termId가 제공되면 해당 학기만 필터링
3. type이 제공되면 해당 유형만 필터링 (REGISTRATION, NEWS, SURVEY)
4. 삭제되지 않은 뉴스레터만 반환
5. ID 오름차순으로 정렬하여 반환

**⚠️ 중요 제약사항**
- schoolId는 필수 파라미터
- termId와 type은 선택사항
- 존재하지 않는 학교 ID는 빈 배열 반환
- type은 유효한 NewsletterType enum 값이어야 함

**📚 예시 시나리오**
- 특정 학교의 전체 뉴스레터 조회
- 특정 학기의 뉴스레터만 조회
- 수강신청 뉴스레터만 필터링하여 조회
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
      example: NewsletterType.REGISTRATION,
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
      summary: '🏫📄 학교 뉴스레터 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 특정 학교의 뉴스레터를 페이지네이션으로 조회합니다
- 무한 스크롤 방식의 UI에서 사용할 수 있도록 지원합니다
- 검색, 필터링, 정렬 기능을 제공합니다

**🔄 비즈니스 로직**
1. schoolId로 해당 학교의 뉴스레터 조회
2. termId 파라미터로 특정 학기 필터링
3. type 파라미터로 뉴스레터 유형 필터링
4. title, body 필드에서 키워드 검색 지원
5. ID 기준 정렬과 페이지네이션 처리

**⚠️ 중요 제약사항**
- schoolId는 필수 파라미터
- page, limit 등 페이지네이션 파라미터 지원
- search 키워드는 title과 body에서 검색
- filter.type으로 다중 타입 필터링 가능

**📚 예시 시나리오**
- 무한 스크롤로 뉴스레터 목록 표시
- 제목/내용 키워드 검색
- 페이지 단위로 뉴스레터 로딩
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
      example: NewsletterType.REGISTRATION,
    }),
    ApiPaginationQuery(SCHOOL_NEWSLETTER_CONFIG),
    ApiOkPaginatedResponse(Newsletter, SCHOOL_NEWSLETTER_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
