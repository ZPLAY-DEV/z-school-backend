import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { ApiPaginatedResponseTemplate } from 'src/core/swagger/response/api-paginated-response.dto';
import { CreateBulkPickDto } from '../dto/create-bulk-pick.dto';
import { EndPickDto, StartPickDto } from '../dto/create-pick.dto';
import { UpdatePickDto } from '../dto/update-pick.dto';
import { Pick } from '../entities/pick.entity';

// StartPick
export const CreatePickDocs = () =>
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

// BulkPick
export const CreatePickBulkDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '여러 학생을 한 번에 반에 등록',
      description:
        '여러 학생을 한 번에 반에 등록합니다. 시스템에 의한 일괄 등록.',
    }),
    ApiBody({ type: CreateBulkPickDto }),
    ApiCreatedResponseTemplate({
      description: '학생 반 일괄 등록 완료',
      type: Pick,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );

// UpdatePick
export const UpdatePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '수강생 pivot 에서 특정 학생의 정보 수정',
      description: '반에 등록된 특정 학생의 정보를 수정합니다.',
    }),
    // UpdatePickDto가 올바른 DTO이므로 이를 사용
    ApiBody({ type: UpdatePickDto }),
    ApiOkResponseTemplate({
      description: '반 수강생 정보 수정 완료',
      type: Pick,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
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
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );

// DeletePick
export const DeletePickDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '수강생 pivot 에서 특정 학생을 삭제',
      description: '반에서 특정 학생을 삭제합니다.',
    }),
    ApiOkResponse({ description: '반 수강생 삭제 완료' }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );

// List Picks (학생이 속한 반 목록 or 반에 속한 학생 목록)
export const ListPicksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생이 속한 반 목록 또는 반에 속한 학생 목록',
      description:
        '특정 학생이 속한 반 목록 또는 반에 속한 학생 목록을 조회합니다.',
    }),
    ApiOkResponseTemplate({
      description: '목록 조회 완료',
      type: Pick,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );

// Paginated List Picks
export const PaginatedListPicksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '학생/반 목록 페이지네이션',
      description:
        '특정 학생이 속한 반 목록 또는 반에 속한 학생 목록을 페이지네이션으로 조회합니다.',
    }),
    ApiPaginatedResponseTemplate({
      description: '페이지네이션 목록 조회 완료',
      type: Pick,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
