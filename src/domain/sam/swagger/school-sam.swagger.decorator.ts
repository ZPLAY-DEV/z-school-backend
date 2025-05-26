import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';

import { CreateSamDto } from '../dto/create-sam.dto';
import { CreateSamResponseDto } from '../dto/create-sam-response.dto';
import { SamResponseDto } from '../dto/sam-response.dto';
import { SamRelationResponseDto } from '../dto/sam-relation-response.dto';
import {
  ApiOkPaginatedResponse,
  ApiPaginationQuery,
  FilterOperator,
} from 'nestjs-paginate';
import { DocumentResponseDto } from 'src/domain/document/dto/document-response.dto';

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
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
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
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
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
      - 검색 조건: alias(강사의 별칭 ), instructor.phone ( 강사의 전화번호 )
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=홍길동 ?search=01012345678 ...
      - 필터 조건: alias(강사이름), editFeePermission(수업료 수정 권한), editEnrollmentPermission(수강신청 수정 권한), instructor.phone(강사의 전화번호), instructor.userId(강사의 유저ID -> 앱 사용 여부 조회 ), groups.name(강사가 가르치는 반의 이름)
        - 필터시 QueryString에 filter.alias, filter.editFeePermission, filter.editEnrollmentPermission, filter.instructor.phone, filter.instructor.userId, filter.groups.name 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.alias=홍길동&filter.editFeePermission=1&filter.editEnrollmentPermission=1&filter.instructor.phone=01012345678&filter.instructor.userId=1&filter.groups.name=수학A ..
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
//? Read School > Sam Documents
//? ---------------------------------------------------------------------- ?//
export const SchoolSamDocumentsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 문서 조회',
      description: `
      - 학교에 속한 특정 강사가 제출한 문서를 조회한다.
      - 페이징 x
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
    ApiOkResponseTemplate({
      description: '학교에 속한 강사의 문서 조회',
      type: DocumentResponseDto,
      isArray: true,
    }),
  );
};
