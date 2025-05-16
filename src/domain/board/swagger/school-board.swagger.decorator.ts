import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { BoardResponseDto } from '../dto/board-response.dto';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { BoardTarget } from 'src/common/enums';

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 사용자가 작성한 게시글 목록 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardMineListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에서 사용자가 작성한 게시글 목록 조회 ',
      description: `
      - 학교에서 해당 사용자가 작성한 게시글 목록
      - 유저 토큰에서 사용자 id를 추출하여 학교에서 해당 사용자가 작성한 게시글을 유동적으로 조회
      - 페이징 X
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '내가 작성한 게시글 목록 조회 완료',
      type: BoardResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 사용자가 작성한 게시글 목록 조회 ( 페이징 )
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardMineListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 학교에서 사용자가 작성한 게시글 목록 조회 & 검색 & 필터 ( 페이징 ) ',
      description: `
      - 학교에서 해당 사용자가 작성한 게시글 목록 조회 ( 페이징 )
      - 유저 토큰에서 사용자 id를 추출하여 학교에서 해당 사용자가 작성한 게시글을 유동적으로 조회
      - 검색 조건: title
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=게시글 제목 ...
      - 필터 조건: groupId(그룹 ID), target(게시글 대상)
        - 필터시 QueryString에 filter.groupId, filter.target 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.groupId=1&filter.target=PARENT ...
      - 정렬은 기본적으로 게시글 생성일 기준으로 정렬됨.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkPaginatedResponse(BoardResponseDto, {
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
        target: [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['title'],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
        target: [FilterOperator.EQ],
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 대상자의 게시글 목록 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardTargetListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에서 대상자의 게시글 목록 조회 ',
      description: `
      - 학교에서 대상자의 게시글 목록 조회
      - queryString에 target 값이 없을 경우 학교에 모든 게시물을 조회 
      - queryString의 target 값이 존재할 경우, target 값을 기반으로  Manger(매니저), Instructor(강사)가 학교에서 작성한 게시물을 대상자 (Instructor, Parent) 화면에서 조회하기 위한 엔드포인트
      - 페이징 X
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiQuery({
      name: 'target',
      enum: BoardTarget,
      description: '게시글 대상',
      required: false,
    }),
    ApiQuery({
      name: 'groupIds',
      type: [Number],
      description: '그룹 ID 배열',
      required: false,
    }),
    ApiOkResponseTemplate({
      description: '대상 게시글 목록 조회 완료',
      type: BoardResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교에서 대상자의 게시글 목록 조회 ( 페이징 )
//? ---------------------------------------------------------------------- ?//
export const SchoolBoardTargetListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '✅ 학교에서 대상자의 게시글 목록 조회 & 검색 & 필터 ( 페이징 ) ',
      description: `
      - 학교에서 대상자의 게시글 목록 조회 ( 페이징 )
      - queryString에 target 값이 없을 경우 학교에 모든 게시물을 조회 
      - queryString의 target 값이 존재할 경우, target 값을 기반으로  Manger(매니저), Instructor(강사)가 학교에서 작성한 게시물을 대상자 (Instructor, Parent) 화면에서 조회하기 위한 엔드포인트
      - 검색 조건: title
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=게시글 제목 ...
      - 필터 조건: groupId(그룹 ID), target(게시글 대상)
        - 필터시 QueryString에 filter.groupId, filter.target 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.groupId=1&filter.target=PARENT ...
      - 정렬은 기본적으로 게시글 생성일 기준으로 정렬됨.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiQuery({
      name: 'target',
      enum: BoardTarget,
      description: '게시글 대상',
      required: false,
    }),
    ApiQuery({
      name: 'groupIds',
      type: [Number],
      description: '그룹 ID 배열',
      required: false,
    }),
    ApiOkPaginatedResponse(BoardResponseDto, {
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
        target: [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['title'],
      filterableColumns: {
        groupId: [FilterOperator.EQ],
      },
    }),
  );
};
