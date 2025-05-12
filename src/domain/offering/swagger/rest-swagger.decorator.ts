import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
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
import { CreateOfferingDto } from '../dto/create-offering.dto';
import { UpdateOfferingDto } from '../dto/update-offering.dto';
import { Offering } from '../entities/offering.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Offering
//? ---------------------------------------------------------------------- ?//

export const CreateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 생성',
      description: `
      - 수강신청과목 생성
      `,
    }),
    ApiBody({
      type: CreateOfferingDto,
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청과목 등록 완료',
      type: Offering,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Offering by ID
//? ---------------------------------------------------------------------- ?//

export const GetOfferingByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 상세 조회',
      description: `
      - 수강신청과목 ID로 상세 정보 조회
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 상세 조회 완료',
      type: Offering,
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
//? Update Offering
//? ---------------------------------------------------------------------- ?//

export const UpdateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 수정',
      description: `
      - 수강신청과목 업데이트
      - Request의 UpdateOfferingDto는 PartialType(CreateOfferingDto)로 변경 원하는 필드만 작성
      `,
    }),
    ApiBody({
      type: UpdateOfferingDto,
      examples: {
        example1: {
          value: {
            lessonName: '과목명',
            groupName: '반 이름',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 업데이트 완료',
      type: Offering,
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
//? Remove Offering
//? ---------------------------------------------------------------------- ?//

export const RemoveOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 삭제',
      description: `
      - 수강신청과목 삭제 (소프트 삭제)
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 삭제 완료',
      type: Offering,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

const TERM_OFFERING_CONFIG: PaginateConfig<Offering> = {
  sortableColumns: ['id', 'lessonName', 'groupName'],
  searchableColumns: ['lessonName', 'groupName'],
  defaultSortBy: [['id', 'DESC']],
  filterableColumns: {
    enrollmentRule: true,
    allowedGrades: true,
  },
};

//? ---------------------------------------------------------------------- ?//
//? Create Term > Offerings
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 bulk 생성',
      description: `
      - 특정 학기에 속한 학교 및 과목 정보를 바탕으로 수강신청과목 일괄 생성
      - 학기 ID에 연결된 과목과 반 정보를 활용하여 수강신청과목(Offering) 생성
      `,
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청과목 일괄 생성 완료',
      type: Offering,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_TERM],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Term > Offerings Paginated List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingPaginatedListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 리스트 (paginated)',
      description: `
      - 특정 학기에 속한 모든 수강신청과목의 페이지네이션 리스트
      - 정렬, 필터링, 검색 기능 제공
      `,
    }),
    ApiPaginationQuery(TERM_OFFERING_CONFIG),
    ApiOkPaginatedResponse(Offering, TERM_OFFERING_CONFIG),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_TERM],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Term > Offerings List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermOfferingListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 리스트 (all)',
      description: `
      - 특정 학기에 속한 모든 수강신청과목의 전체 리스트
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 리스트 조회 완료',
      type: Offering,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_TERM],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete All Term Offerings
//? ---------------------------------------------------------------------- ?//

export const DeleteAllSchoolTermOfferingsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 > 수강신청과목 👈 bulk 삭제',
      description: `
      - 특정 학기에 속한 모든 수강신청과목을 삭제
      - 삭제된 수강신청과목의 수를 반환
      `,
    }),
    ApiOkResponse({
      description: '수강신청과목 전체 삭제 완료',
      schema: {
        type: 'number',
        example: 42,
        description: '삭제된 수강신청과목의 수',
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.CONDITION_NOT_MET],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_TERM],
      },
    ]),
  );
};
