import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Offering } from '../entities/offering.entity';

const TERM_OFFERING_CONFIG: PaginateConfig<Offering> = {
  sortableColumns: ['id', 'lessonName', 'groupName'],
  searchableColumns: ['lessonName', 'groupName'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    pickRule: true,
    allowedGrades: true,
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 bulk 생성',
      description: `
      - 특정 학기에 속한 학교 및 과목 정보를 바탕으로 수강신청과목 일괄 생성
      - 학기 ID에 연결된 과목과 반 정보를 활용하여 수강신청과목(Offering) 생성
      - [Patch] /v1/terms/:id 를 통해 수강신청기간을 설정시 수강신청과목(Offering) 자동생성되는 것과 동일 로직
      `,
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청과목 일괄 생성 완료',
      type: Offering,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 리스트 (paginated)',
      description: `
      - 특정 학기에 속한 모든 수강신청과목의 페이지네이션 리스트
      - 정렬, 필터링, 검색 기능 제공
      `,
    }),
    ApiPaginationQuery(TERM_OFFERING_CONFIG),
    ApiOkPaginatedResponse(Offering, TERM_OFFERING_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Term > Offerings List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 리스트 (all)',
      description: `
      - 특정 학기에 속한 모든 수강신청과목의 전체 리스트
      - 학년 필터링 기능 제공 (예, ?grade=1 는 1학년이 들을 수 있는 과목만 보임)
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 리스트 조회 완료',
      type: Offering,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete School > Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 bulk 삭제',
      description: `
      - 특정 학기에 속한 모든 수강신청과목을 삭제
      - 삭제된 수강신청과목의 수를 반환
      `,
    }),
    ApiOkResponse({
      description: '수강신청과목 전체 삭제 완료',
      schema: {
        type: 'number',
        example: 42,
        description: '삭제된 수강신청과목의 수',
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
