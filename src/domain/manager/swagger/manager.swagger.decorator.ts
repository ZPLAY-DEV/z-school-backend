import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
  PaginateConfig,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { CreateManagerDto } from '../dto/create-manager.dto';
import { UpdateManagerDto } from '../dto/update-manager.dto';
import { Manager } from '../entities/manager.entity';

const MANAGER_CONFIG: PaginateConfig<Manager> = {
  sortableColumns: ['id', 'name', 'phone'],
  searchableColumns: ['name'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    phone: [FilterOperator.EQ, FilterOperator.IN, FilterOperator.ILIKE],
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create Manager
//? ---------------------------------------------------------------------- ?//

export const CreateManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '관리자 생성',
      description: `
      - 관리자를 생성한다.
      - 관리자는 학교에 소속되어 관리 권한을 가진다.
      `,
    }),
    ApiBody({
      type: CreateManagerDto,
    }),
    ApiCreatedResponse({
      description: '관리자 생성 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Managers with Pagination
//? ---------------------------------------------------------------------- ?//

export const GetManagersPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '관리자 리스트 (페이지네이션)',
      description: `
      - 페이지네이션을 적용한 관리자 리스트를 조회한다.
      `,
    }),
    ApiPaginationQuery(MANAGER_CONFIG),
    ApiOkPaginatedResponse(Manager, MANAGER_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Active Managers
//? ---------------------------------------------------------------------- ?//

export const GetActiveManagersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '활성 관리자 리스트',
      description: `
      - 활성 상태인 모든 관리자 리스트를 조회한다.
      - 삭제되지 않은 관리자만 조회된다.
      `,
    }),
    ApiOkResponse({
      description: '활성 관리자 리스트 조회 완료',
      type: [Manager],
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Manager by ID
//? ---------------------------------------------------------------------- ?//

export const GetManagerByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '관리자 상세 조회',
      description: `
      - 특정 관리자의 상세 정보를 조회한다.
      - 관련된 유저 정보와 댓글도 함께 조회된다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '관리자 ID',
      required: true,
      example: 1,
    }),
    ApiOkResponse({
      description: '관리자 상세 조회 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Manager
//? ---------------------------------------------------------------------- ?//

export const UpdateManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '관리자 수정',
      description: `
      - 관리자 정보를 수정한다.
      - 부분 업데이트를 지원한다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '관리자 ID',
      required: true,
      example: 1,
    }),
    ApiBody({
      type: UpdateManagerDto,
      examples: {
        example1: {
          value: {
            name: '홍길동',
            phone: '01012345678',
            note: '업데이트된 관리자 정보',
          },
        },
      },
    }),
    ApiExtraModels(Manager),
    ApiOkResponse({
      description: '관리자 수정 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Manager
//? ---------------------------------------------------------------------- ?//

export const DeleteManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '관리자 삭제',
      description: `
      - 관리자를 삭제한다.
      - 소프트 삭제로 처리된다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '관리자 ID',
      required: true,
      example: 1,
    }),
    ApiOkResponse({
      description: '관리자 삭제 완료',
      type: Manager,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
