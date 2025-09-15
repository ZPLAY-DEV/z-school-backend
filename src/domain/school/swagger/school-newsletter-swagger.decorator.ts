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
  sortableColumns: ['id', 'createdAt'],
  searchableColumns: ['title', 'body'],
  defaultSortBy: [['id', 'ASC']],
  filterableColumns: {
    type: [FilterOperator.EQ, FilterOperator.IN],
    status: [FilterOperator.EQ, FilterOperator.IN],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Get Registration Newsletter
//? ---------------------------------------------------------------------- ?//

export const GetRegistrationNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 수강신청 뉴스레터 조회',
      description: `
**📝 기능 설명**
- 특정 학교와 학기의 수강신청 뉴스레터를 조회합니다
- REGISTRATION 타입의 뉴스레터만 반환됩니다
- 학기당 하나의 수강신청 뉴스레터만 존재할 수 있습니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학교의 특정 학기 조회
2. REGISTRATION 타입의 뉴스레터만 필터링
3. 삭제되지 않은 뉴스레터만 반환
4. 수강신청 뉴스레터가 없으면 404 에러 반환

**⚠️ 중요 제약사항**
- schoolId와 termId는 필수 파라미터
- REGISTRATION 타입 뉴스레터만 조회 가능
- 존재하지 않는 경우 404 에러 반환
- 학기당 하나의 수강신청 뉴스레터만 존재

**📚 예시 시나리오**
- 수강신청 페이지에서 안내 뉴스레터 표시
- 학기별 수강신청 안내 정보 조회
- 수강신청 관련 공지사항 확인
      `,
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
    ApiExtraModels(Newsletter),
    ApiOkResponse({
      description: '수강신청 뉴스레터 조회 완료',
      schema: {
        $ref: getSchemaPath(Newsletter),
        description: '해당 학교와 학기의 수강신청 뉴스레터',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List School Term Newsletters
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 학기별 뉴스레터 목록 조회',
      description: `
**📝 기능 설명**
- 특정 학교와 학기의 뉴스레터 목록을 조회합니다
- 타입별 필터링을 지원합니다
- ID 오름차순으로 정렬하여 시간순 조회가 가능합니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학교의 특정 학기 뉴스레터 조회
2. type이 제공되면 해당 유형만 필터링 (REGISTRATION, NEWS, SURVEY)
3. 삭제되지 않은 뉴스레터만 반환
4. ID 오름차순으로 정렬하여 반환

**⚠️ 중요 제약사항**
- schoolId와 termId는 필수 파라미터
- type은 선택사항
- 존재하지 않는 학교/학기 ID는 빈 배열 반환
- type은 유효한 NewsletterType enum 값이어야 함

**📚 예시 시나리오**
- 특정 학교의 특정 학기 뉴스레터 조회
- 특정 학기의 공지사항만 필터링하여 조회
- 수강신청 뉴스레터만 필터링하여 조회
      `,
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
      description: '학기 ID - 특정 학기의 뉴스레터만 조회',
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
      summary: '🏫📄 학교 학기별 뉴스레터 페이지네이션 조회',
      description: `
**📝 기능 설명**
- 특정 학교와 학기의 뉴스레터를 페이지네이션으로 조회합니다
- 무한 스크롤 방식의 UI에서 사용할 수 있도록 지원합니다
- 검색, 필터링, 정렬 기능을 제공합니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학교의 특정 학기 뉴스레터 조회
2. type 파라미터로 뉴스레터 유형 필터링
3. title, body 필드에서 키워드 검색 지원
4. ID 기준 정렬과 페이지네이션 처리

**⚠️ 중요 제약사항**
- schoolId와 termId는 필수 파라미터
- page, limit 등 페이지네이션 파라미터 지원
- search 키워드는 title과 body에서 검색
- filter.type으로 다중 타입 필터링 가능

**📚 예시 시나리오**
- 무한 스크롤로 특정 학기 뉴스레터 목록 표시
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
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID - 특정 학기의 뉴스레터만 조회',
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
