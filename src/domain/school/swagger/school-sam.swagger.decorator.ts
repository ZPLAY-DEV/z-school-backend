import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiOkPaginatedResponse } from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateSamDto } from '../../sam/dto/create-sam.dto';
import { Sam } from '../../sam/entities/sam.entity';

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolSamBulkDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🟢 학교 강사 일괄 생성/수정 (계약서 업로드)',
      description:
        '강사를 일괄 생성/수정합니다 (Upsert 방식: 이름+전화번호 기준 중복 체크).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiBody({
      type: [CreateSamDto],
      description: '생성/수정할 강사 정보 배열',
    }),
    ApiCreatedResponse({
      description: '강사 일괄 등록 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 강사 수',
        example: 15,
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk DryRun
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolSamBulkDryRunDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '🔍 학교 강사 일괄 생성 시뮬레이션 (Dry Run)',
      description:
        '강사 일괄 등록을 시뮬레이션합니다 (DB 변경 없이 중복 강사 정보만 반환).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiBody({
      type: [CreateSamDto],
      description: '시뮬레이션할 강사 정보 배열',
    }),
    ApiOkResponseTemplate({
      description: '중복 강사 시뮬레이션 결과',
      type: Sam,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? School Sam List
//? ---------------------------------------------------------------------- ?//

export const SchoolSamListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👨‍🏫 학교 전체 강사 목록 조회',
      description: '학교에 소속된 모든 강사 목록을 조회합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 전체 강사 목록 조회 완료',
      type: Sam,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? School Sam Paginated
//? ---------------------------------------------------------------------- ?//

export const SchoolSamPaginatedDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '👨‍🏫📄 학교 강사 목록 페이지네이션 조회 (검색/정렬)',
      description:
        '강사 목록을 페이지네이션으로 조회합니다 (검색: name/alias/specialty/email, 정렬: id/alias).',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiOkPaginatedResponse(Sam, {
      sortableColumns: ['id', 'alias'],
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );

//? ---------------------------------------------------------------------- ?//
//? Upload School Sam Excel
//? ---------------------------------------------------------------------- ?//

export const UploadSchoolSamExcelDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📊 Excel 파일로 강사 일괄 등록',
      description: 'Excel 파일을 업로드하여 강사 정보를 일괄 등록/수정합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Excel 파일 (.xlsx)',
          },
        },
        required: ['file'],
      },
    }),
    ApiCreatedResponse({
      description: '강사 일괄 등록 완료',
      schema: {
        type: 'number',
        description: '생성/업데이트된 강사 수',
        example: 15,
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );

//? ---------------------------------------------------------------------- ?//
//? Download School Sam Excel
//? ---------------------------------------------------------------------- ?//

export const DownloadSchoolSamExcelDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📥 강사 목록 Excel 파일 다운로드',
      description: '학교의 강사 목록을 Excel 파일로 다운로드합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiOkResponse({
      description: 'Excel 파일 다운로드 완료',
      schema: {
        type: 'string',
        format: 'binary',
        description: 'Excel 파일 (.xlsx)',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
