import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';

import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Group } from 'src/domain/group/entities/group.entity';
import { CreateSamResponseDto } from '../../sam/dto/create-sam-response.dto';
import { CreateSamDto } from '../../sam/dto/create-sam.dto';
import { SamRelationResponseDto } from '../../sam/dto/sam-relation-response.dto';
import { SamResponseDto } from '../../sam/dto/sam-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Create School > Sam
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolSamBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 Bulk 생성',
      description: `
      - 학교에 속한 강사를 BULK로 생성.
      - 학교에 속한 강사가 이미 존재할 경우 Upsert 처리
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateSamDto,
      isArray: true,
    }),
    ApiCreatedResponseTemplate({
      description: '학교에 속한 강사(sam) 생성 완료',
      type: CreateSamResponseDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School > DryRun Bulk
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolSamBulkDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 bulk 생성 (dryrun)',
      description: `
      - 학교 > 강사(Bulk) 생성 dryrun 체크 -> dryrun은 실제로 데이터를 등록할 때, 데이터를 덮어쓰는 여부를 판별하는 엔드포인트
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인 ( 해당 엔드포인트로 Upsert 여부를 결정 )
      - 반환되는 값이 존재할 경우 instructor phone 으로 중복 여부를 판단
      - 반환되는 값이 빈 배열일 경우, 중첩되는 강사가 없음을 의미
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateSamDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '덮어쓰여질 레코드 목록',
      type: SamResponseDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Read School > Sam List
//? ---------------------------------------------------------------------- ?//
export const SchoolSamListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 목록 조회',
      description: `
      - 학교에 속한 강사(sam) 목록 조회
      - 페이징 x
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교에 속한 강사(sam) 목록 조회',
      type: SamRelationResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Read School > Sam (Paginated)
//? ---------------------------------------------------------------------- ?//
export const SchoolSamPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 목록 조회 (페이징)',
      description: `
      - 학교에 속한 강사 리스트를 페이징 조회한다.
      - 해당 엔드포인트로 페이징 기반 강사 전체조회, 강사 검색, 필터가 가능. 
      - 검색 조건: alias(강사의 별칭 ), instructor.phone ( 강사의 전화번호 ), groups.groupName ( 강사가 가르치는 반의 이름 )
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=홍길동 ?search=01012345678 ? search=수학 ...
      - 필터 조건: alias(강사이름), editFeePermission(수업료 수정 권한), editEnrollmentPermission(수강신청 수정 권한), instructor.phone(강사의 전화번호), instructor.userId(강사의 유저ID -> 앱 사용 
      - 정렬 조건: alias(강사의 별칭)으로 정렬이 가능
      `,
    }),
    ApiOkPaginatedResponse(SamRelationResponseDto, {
      sortableColumns: ['alias'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        alias: [FilterOperator.EQ, FilterOperator.ILIKE],
        'groups.name': [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.userId': [FilterOperator.EQ],
        'instructor.phone': [FilterOperator.EQ, FilterOperator.ILIKE],
        editFeePermission: [FilterOperator.EQ],
        editEnrollmentPermission: [FilterOperator.EQ],
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['alias'],
      defaultSortBy: [['alias', 'ASC']],
      searchableColumns: ['alias', 'instructor.phone'],
      filterableColumns: {
        alias: [FilterOperator.EQ, FilterOperator.ILIKE],
        'groups.name': [FilterOperator.EQ, FilterOperator.ILIKE],
        'instructor.userId': [FilterOperator.EQ],
        'instructor.phone': [FilterOperator.EQ, FilterOperator.ILIKE],
        editFeePermission: [FilterOperator.EQ],
        editEnrollmentPermission: [FilterOperator.EQ],
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get School > Sam Groups For Date
//? ---------------------------------------------------------------------- ?//
export const GetSchoolSamGroupsForDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 특정 날짜 수업 반 목록 조회',
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
