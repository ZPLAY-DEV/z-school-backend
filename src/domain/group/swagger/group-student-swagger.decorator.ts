import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  PaginateConfig,
} from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { TraceableNoteDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';

const GROUP_STUDENT_PAGINATE_CONFIG: PaginateConfig<GroupStudent> = {
  sortableColumns: ['id'],
  defaultSortBy: [['id', 'DESC']],
  searchableColumns: ['note'],
  filterableColumns: {
    enrolledBy: true,
    deletedBy: true,
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create Group Student
//? ---------------------------------------------------------------------- ?//

export const CreateGroupStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 > 수강생 👈 등록 (수강신청 이후 사유와 함께 개별적 등록)',
      description: `
      - 개별 학생을 반에 등록합니다.
      - note에 등록 사유를 남길 수 있습니다.
      - enrolledBy는 API 호출하는 사람의 role 에 따란 자동으로 매니져|강사|기타 중 하나로 설정됩니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
    }),
    ApiBody({
      type: TraceableNoteDto,
    }),
    ApiCreatedResponseTemplate({
      description: '학생 반 등록 완료',
      type: GroupStudent,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Group Student Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateGroupStudentBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '반 > 수강생 👈 bulk 등록 (정상적인 수강신청을 통해 선별한 학생들을 반에 일괄 등록시)',
      description: `
      - 여러 학생을 한 번에 반에 등록합니다.
      - 시스템에 의한 일괄 등록으로 처리됩니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiBody({
      schema: {
        properties: {
          studentIds: {
            type: 'array',
            items: {
              type: 'number',
            },
            description: '등록할 학생 ID 배열',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '학생 반 일괄 등록 완료',
      type: GroupStudent,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List Group Students
//? ---------------------------------------------------------------------- ?//

export const ListGroupStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 > 수강생 👈 리스트 (all)',
      description: `
      - 특정 반에 등록된 모든 학생 목록을 조회합니다.
      - 학생 및 학부모 정보를 포함합니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiOkResponseTemplate({
      description: '반 수강생 목록 조회 완료',
      type: GroupStudent,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Paginated List Group Students
//? ---------------------------------------------------------------------- ?//

export const PaginatedListGroupStudentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 > 수강생 👈 리스트 (paginated)',
      description: `
      - 특정 반에 등록된 학생 목록을 페이지네이션으로 조회합니다.
      - 검색, 정렬, 필터링 기능을 지원합니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiPaginationQuery(GROUP_STUDENT_PAGINATE_CONFIG),
    ApiOkPaginatedResponse(GroupStudent, GROUP_STUDENT_PAGINATE_CONFIG),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Group Student
//? ---------------------------------------------------------------------- ?//

export const UpdateGroupStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary:
        '반 > 수강생 👈 수정 (해당 소속된 반에 관련된 정보를 수정. 교재비 10,000원 등)',
      description: `
      - 반에 등록된 특정 학생의 정보를 수정합니다.
      - 수정하고자 하는 필드만 요청에 포함합니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
    }),
    ApiBody({
      type: UpdateGroupDto,
    }),
    ApiOkResponseTemplate({
      description: '반 수강생 정보 수정 완료',
      type: GroupStudent,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Group Student
//? ---------------------------------------------------------------------- ?//

export const DeleteGroupStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 > 수강생 👈 삭제 (사유와 함께 개별적 반에서 강퇴)',
      description: `
      - 반에서 특정 학생을 삭제합니다.
      - note에 삭제 사유를 남겨야 합니다.
      - deletedBy는 API 호출하는 사람의 role 에 따란 자동으로 매니져|강사|기타 중 하나로 설정됩니다.
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: Number,
      description: '반 ID',
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
    }),
    ApiBody({
      type: TraceableNoteDto,
    }),
    ApiOkResponse({
      description: '반 수강생 삭제 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
