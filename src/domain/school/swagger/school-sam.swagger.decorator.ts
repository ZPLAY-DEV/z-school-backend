import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiOkPaginatedResponse } from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamDto } from '../../sam/dto/create-sam.dto';
import { Sam } from '../../sam/entities/sam.entity';

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolSamBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 대량 생성 (일괄)',
      description: `
      - 학교에 귀속된 강사들을 대량으로 생성한다.
      - 학교에 귀속된 강사의 정보와 강사의 정보가 이미 등록되어 있을 경우 Upsert 된다.
      - 대량 생성은 배열 형태의 데이터를 받아서 처리한다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: [CreateSamDto],
    }),
    ApiCreatedResponseTemplate({
      description: '학교에 속한 강사 대량 생성 완료',
      type: Sam,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School Sam Bulk DryRun
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolSamBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 대량 생성 dryRun 체크',
      description: `
      - 학교에 속한 강사들(대량) 생성 dryrun 체크
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인
      - 중복되는 강사가 있는지 사전에 체크 가능
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: [CreateSamDto],
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 대량 등록 시물레이션 결과',
      type: Sam,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? School Sam List
//? ---------------------------------------------------------------------- ?//
export const SchoolSamListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 목록 조회',
      description: `
      - 특정 학교에 속한 모든 강사들의 목록을 조회한다.
      - 강사 기본 정보와 관련 데이터를 포함한다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사 목록 조회 완료',
      type: Sam,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? School Sam Paginated
//? ---------------------------------------------------------------------- ?//
export const SchoolSamPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 무한스크롤 목록 조회',
      description: `
      - 특정 학교에 속한 강사들의 페이지네이션된 목록을 조회한다.
      - 무한스크롤 방식의 페이지네이션을 지원한다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkPaginatedResponse(Sam, {
      sortableColumns: ['id', 'alias'],
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Sam Groups For Date
//? ---------------------------------------------------------------------- ?//
export const GetSchoolSamGroupsForDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 강사 특정 날짜 수업 반 목록 조회',
      description: `
      - 특정 학교의 강사가 특정 날짜에 수업하는 반 목록을 시간 순으로 조회한다.
      - 날짜 형식은 YYYY-MM-DD 형식으로 입력해야 한다.
      - 결과는 수업 시작 시간을 기준으로 오름차순 정렬된다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiParam({
      name: 'samId',
      type: Number,
      description: '강사 ID',
    }),
    ApiParam({
      name: 'date',
      type: String,
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponseTemplate({
      description: '특정 날짜의 강사 수업 반 목록 조회 완료',
      type: Group,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
