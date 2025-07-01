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
import { EndPickDto, StartPickDto } from '../dto/create-pick.dto';
import { UpdatePickDto } from '../dto/update-pick.dto';
import { Pick } from '../entities/pick.entity';

const LIST_STUDENTS_CONFIG: PaginateConfig<Pick> = {
  relations: {
    student: {
      parent: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    enrolledBy: [FilterOperator.EQ],
    deletedBy: [FilterOperator.EQ],
  },
};

const LIST_GROUPS_CONFIG: PaginateConfig<Pick> = {
  relations: {
    group: {
      lesson: true,
    },
  },
  sortableColumns: ['id'],
  searchableColumns: ['note'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    enrolledBy: [FilterOperator.EQ],
    deletedBy: [FilterOperator.EQ],
  },
};

// StartPick
export const StartPickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '이유와 함께 수업시작일 기록',
      description:
        '중간에 반에 join 하는 경우. 개별 학생을 반에 등록합니다. note에 등록 사유를 남길 수 있습니다. (schooldays 에 근거하여 cron 이 다이나모 출석부를 자동 생성하므로, 출석부 생성로직은 없음.)',
    }),
    ApiBody({ type: StartPickDto }),
    ApiCreatedResponseTemplate({
      description: '학생 반 등록 완료',
      type: Pick,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );

// EndPick
export const EndPickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '이유와 함께 수업종료일 기록',
      description:
        '중간에 반에서 quit 하는 경우. 반에 등록된 특정 학생의 마지막 수업일을 기록하고 pick 상태를 종료로 변경합니다.',
    }),
    ApiBody({ type: EndPickDto }),
    ApiOkResponseTemplate({
      description: '반 수강생 수업 종료 완료',
      type: Pick,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListStudents - 특정 그룹의 학생 목록 조회
export const ListStudentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 그룹의 학생 목록 조회',
      description: '특정 그룹(반)에 등록된 모든 학생의 목록을 조회합니다.',
    }),
    ApiOkResponseTemplate({
      description: '그룹의 학생 목록 조회 성공',
      type: Pick,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListStudents - 특정 그룹의 학생 목록 페이지네이션 조회
export const PaginatedListStudentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 그룹의 학생 목록 페이지네이션 조회',
      description:
        '특정 그룹(반)에 등록된 학생의 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiPaginationQuery(LIST_STUDENTS_CONFIG),
    ApiOkPaginatedResponse(Pick, LIST_STUDENTS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// ListGroups - 특정 학생의 그룹 목록 조회
export const ListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 학생의 그룹 목록 조회',
      description: '특정 학생이 등록된 모든 그룹(반)의 목록을 조회합니다.',
    }),
    ApiOkResponseTemplate({
      description: '학생의 그룹 목록 조회 성공',
      type: Pick,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// PaginatedListGroups - 특정 학생의 그룹 목록 페이지네이션 조회
export const PaginatedListGroupsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '특정 학생의 그룹 목록 페이지네이션 조회',
      description:
        '특정 학생이 등록된 그룹(반)의 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiPaginationQuery(LIST_GROUPS_CONFIG),
    ApiOkPaginatedResponse(Pick, LIST_GROUPS_CONFIG),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// UpdatePick
export const UpdatePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '확정수강생 pivot 에서 특정 학생의 정보 수정',
      description: '반에 등록된 특정 학생의 정보를 수정합니다.',
    }),
    // UpdatePickDto가 올바른 DTO이므로 이를 사용
    ApiBody({ type: UpdatePickDto }),
    ApiOkResponseTemplate({
      description: '반 수강생 정보 수정 완료',
      type: Pick,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

// DeletePick
export const DeletePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '확정수강생 pivot 에서 특정 학생을 삭제',
      description: '반에서 특정 학생을 삭제합니다.',
    }),
    ApiOkResponse({ description: '반 수강생 삭제 완료' }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
