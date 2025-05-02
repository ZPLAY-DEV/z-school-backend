//? ---------------------------------------------------------------------- ?//
//? Private) Term 생성

import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { CreatePhoneDto } from '../dto/create-phone.dto';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { PhoneResponseDto } from '../dto/phone-response.dto';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { ApiPaginatedResponseTemplate } from 'src/core/swagger/response/api-paginated-response.dto';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';

//? ---------------------------------------------------------------------- ?//
//? Private) 학교의 발신번호 등록
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolPhoneDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: ' 학교의 발신번호 등록 ',
      description: `
      - 학교에 귀속된 발신번호를 등록
      - 등록된 발신번호가 없을 경우 해당 번호의 활성화 상태를 True로 설정
      `,
    }),
    ApiBody({
      type: CreatePhoneDto,
    }),
    ApiCreatedResponseTemplate({
      description: '학교의 발신번호 등록 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.CONFLICT,
        errorFormatList: [HttpErrorConstants.DUPLICATE_PHONE],
      },
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
//? Private) 학교별 발신번호 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolPhoneListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교별 발신번호 조회 ( 페이징 X )',
      description: `
      - 학교에 귀속된 발신번호 리스트를 조회 
      `,
    }),
    ApiOkResponseTemplate({
      description: '학교별 발신번호 조회 완료',
      type: PhoneResponseDto,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교별 발신번호 조회 ( 페이징 O )
//? ---------------------------------------------------------------------- ?//
export const SchoolPhoneListPaginatedDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교별 발신번호 조회 ( 페이징 O )',
      description: `
      - 학교에 귀속된 발신번호 리스트를 조회
      `,
    }),
    PaginateQueryOptions(),
    ApiPaginatedResponseTemplate({
      description: '학교별 발신번호 조회 완료',
      type: PhoneResponseDto,
    }),
  );
};
