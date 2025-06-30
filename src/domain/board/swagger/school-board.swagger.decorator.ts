import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateBoardDto } from '../dto/create-board.dto';
import { Board } from '../entities/board.entity';

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 사용자가 작성한 게시글 목록 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에서 사용자가 작성한 게시글 목록 조회',
      description: `
      - 학교에서 사용자가 작성한 게시글 목록을 조회한다
      - 페이징 X
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '게시글 목록 조회 완료',
      type: Board,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 사용자가 작성한 게시글 목록 조회 (페이징)
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에서 사용자(강사)가 작성한 게시글 목록 조회 (페이징)',
      description: `
      - 학교에서 사용자(강사)가 작성한 게시글 목록을 조회한다
      - 검색 조건: title
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=게시글 제목 ...
      - 필터 조건: groupId(그룹 ID)
        - 필터시 QueryString에 filter.groupId 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.groupId=1...
      - 정렬은 기본적으로 게시글 생성일 기준으로 정렬됨.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      required: true,
    }),
    ApiOkPaginatedResponse(Board, {
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
    }),
    ApiPaginationQuery({
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['title'],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
  );
};
//? ---------------------------------------------------------------------- ?//
//? Private) 사용자(강사)가 작성한 본인의 게시글 목록 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardMineListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 강사가 학교별 업로드한 본인의 게시글 목록 조회 ',
      description: `
      - 강사가 학교별 업로드한 본인의 게시글 목록
      - 유저 토큰에서 사용자 id를 추출하여 학교에서 해당 사용자가 작성한 게시글을 유동적으로 조회
      - 페이징 X
      `,
    }),
    ApiOkResponseTemplate({
      description: '내가 작성한 게시글 목록 조회 완료',
      type: Board,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 사용자(강사)가 작성한 본인의 게시글 목록 조회 ( 페이징 )
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardMineListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 강사가 학교별 업로드한 본인의 게시글 목록 조회 & 검색 & 필터 ( 페이징 ) ',
      description: `
      - 강사가 학교별 업로드한 본인의 게시글 목록 조회 ( 페이징 )
      - 유저 토큰에서 사용자 id를 추출하여 학교에서 해당 사용자가 작성한 게시글을 유동적으로 조회
      - 검색 조건: title
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=게시글 제목 ...
      - 필터 조건: groupId(그룹 ID)
        - 필터시 QueryString에 filter.groupId, 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.groupId=1....
      - 정렬은 기본적으로 게시글 생성일 기준으로 정렬됨.
      `,
    }),
    ApiOkPaginatedResponse(Board, {
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['title'],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 게시글 대상자(학부모)의 목록 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardTargetListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학부모가 groups 별 강사가 게시한 게시글 목록 조회  ',
      description: `
      - 학부모가 groups 별 강사가 게시한 게시글 목록을 조회한다
      - queryString에 groupIds 값이 없을 경우 학교에 모든 게시물을 조회 
      - queryString의 groupIds 값이 존재할 경우, groupIds 값을 기반으로 학부모가 속한 groups 별 강사가 게시한 게시글을 조회한다
      - 페이징 X
      `,
    }),
    ApiQuery({
      name: 'groupIds',
      type: [Number],
      description: '그룹 ID 배열',
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '대상 게시글 목록 조회 완료',
      type: Board,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 게시글 대상자(학부모)의 목록 조회 ( 페이징 )
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardTargetListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 학부모가 groups 별 강사가 게시한 게시글 목록 조회 & 검색 & 필터 ( 페이징 ) ',
      description: `
      - 학부모가 groups 별 강사가 게시한 게시글 목록 조회 ( 페이징 )
      - queryString에 groupIds 값이 없을 경우 학교에 모든 게시물을 조회 
      - queryString의 groupIds 값이 존재할 경우, groupIds 값을 기반으로 학부모가 속한 groups 별 강사가 게시한 게시글을 조회한다
      - 검색 조건: title
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=게시글 제목 ...
      - 필터 조건: groupId(그룹 ID)
        - 필터시 QueryString에 filter.groupId 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.groupId=1...
      - 정렬은 기본적으로 게시글 생성일 기준으로 정렬됨.
      `,
    }),
    ApiQuery({
      name: 'groupIds',
      type: [Number],
      description: '그룹 ID 배열',
      required: false,
    }),
    ApiOkPaginatedResponse(Board, {
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      searchableColumns: ['title'],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
  );
};

export const CreateSchoolBoardDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 게시글 생성',
      description: `
      - 학교 관리자가 학교 공지사항을 작성합니다.
      `,
    }),
    ApiParam({ name: 'schoolId', type: Number, description: '학교 ID' }),
    ApiBody({ type: CreateBoardDto }),
    ApiCreatedResponseTemplate({
      description: '학교 게시글 생성 완료',
      type: Board,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

export const SchoolBoardFindByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 게시글 상세 조회',
      description: `
      - 특정 학교의 게시글 상세 정보를 조회합니다.
      `,
    }),
    ApiParam({ name: 'schoolId', type: Number, description: '학교 ID' }),
    ApiParam({ name: 'boardId', type: Number, description: '게시글 ID' }),
    ApiOkResponseTemplate({
      description: '학교 게시글 상세 조회 완료',
      type: Board,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? School Board Infinite List
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardInfiniteListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 게시글 무한스크롤 목록 조회',
      description: `
      - 특정 학교의 게시글을 무한스크롤 방식으로 조회합니다.
      `,
    }),
    ApiParam({ name: 'schoolId', type: Number, description: '학교 ID' }),
    ApiOkPaginatedResponse(Board, {
      sortableColumns: ['id', 'title'],
    }),
  );
