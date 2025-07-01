import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
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
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { EndContractDto, StartContractDto } from '../dto/create-contract.dto';
import { Contract } from '../entities/contract.entity';

const LIST_SAMS_CONFIG: PaginateConfig<Contract> = {
  relations: {
    sam: {
      school: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    startedBy: [FilterOperator.EQ],
    endedBy: [FilterOperator.EQ],
  },
};

const LIST_GROUPS_CONFIG: PaginateConfig<Contract> = {
  relations: {
    group: {
      lesson: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    startedBy: [FilterOperator.EQ],
    endedBy: [FilterOperator.EQ],
  },
};

// StartContract
export const StartContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '이유와 함께 담임 계약 시작일 기록',
      description:
        '중간에 담임 계약에 join 하는 경우. 개별 선생님을 반에 등록합니다. note에 등록 사유를 남길 수 있습니다.',
    }),
    ApiBody({ type: StartContractDto }),
    ApiCreatedResponseTemplate({
      description: '담임 계약 시작 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

// EndContract
export const EndContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '이유와 함께 담임 계약 종료일 기록',
      description:
        '중간에 담임 계약에서 quit 하는 경우. 반에 등록된 특정 선생님의 마지막 수업일을 기록하고 계약 상태를 종료로 변경합니다.',
    }),
    ApiBody({ type: EndContractDto }),
    ApiOkResponseTemplate({
      description: '담임 계약 종료 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListSams - 특정 수업의 담임선생님 목록 조회
export const ListSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 수업의 담임선생님 목록 조회',
      description: '특정 수업에 등록된 모든 담임선생님의 목록을 조회합니다.',
    }),
    ApiOkResponseTemplate({
      description: '수업의 담임선생님 목록 조회 성공',
      type: Contract,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListSams - 특정 수업의 담임선생님 목록 페이지네이션 조회
export const PaginatedListSamsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 수업의 담임선생님 목록 페이지네이션 조회',
      description:
        '특정 수업에 등록된 담임선생님의 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiPaginationQuery(LIST_SAMS_CONFIG),
    ApiOkPaginatedResponse(Contract, LIST_SAMS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListGroups - 특정 담임선생님의 반 목록 조회
export const ListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 담임선생님의 반 목록 조회',
      description: '특정 담임선생님이 담당하는 모든 반의 목록을 조회합니다.',
    }),
    ApiOkResponseTemplate({
      description: '담임선생님의 반 목록 조회 성공',
      type: Contract,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListGroups - 특정 담임선생님의 반 목록 페이지네이션 조회
export const PaginatedListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 담임선생님의 반 목록 페이지네이션 조회',
      description:
        '특정 담임선생님이 담당하는 반의 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiPaginationQuery(LIST_GROUPS_CONFIG),
    ApiOkPaginatedResponse(Contract, LIST_GROUPS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// UpdateContract
export const UpdateContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임 계약에서 특정 정보 수정',
      description: '담임 계약의 특정 정보를 수정합니다.',
    }),
    ApiBody({ type: UpdateGroupDto }),
    ApiOkResponseTemplate({
      description: '담임 계약 정보 수정 완료',
      type: Contract,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// DeleteContract
export const DeleteContractDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '담임 계약에서 특정 계약을 삭제',
      description: '담임 계약에서 특정 계약을 삭제합니다.',
    }),
    ApiOkResponse({ description: '담임 계약 삭제 완료' }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
