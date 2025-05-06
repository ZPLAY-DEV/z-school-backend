//? ---------------------------------------------------------------------- ?//
//? Private) Term 생성

import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { ApiPaginatedResponseTemplate } from 'src/core/swagger/response/api-paginated-response.dto';
import { CreatePhoneDto } from '../dto/create-phone.dto';
import { PhoneResponseDto } from '../dto/phone-response.dto';

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
    // ApiPaginationQuery,
    ApiPaginatedResponseTemplate({
      description: '학교별 발신번호 조회 완료',
      type: PhoneResponseDto,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교의 활성화된 발송번호 조회
//? ---------------------------------------------------------------------- ?//
export const SchoolIsActivePhoneDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 활성화된 발송번호 조회',
      description: `
      - 학교당 활성화된 발송번호는 1개이고 해당 정보를 조회한다.
      - 만약 등록되지 않은 학교ID를 첨부해서 요청을 보낼 경우 Error Handling을 하지 않고 status 200, result null로 반환한다.
      `,
    }),
    ApiOkResponseTemplate({
      description: '학교의 활성화된 발송번호 조회 완료',
      type: PhoneResponseDto,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교의 활성화된 발송번호 활성화/비활성화
//? ---------------------------------------------------------------------- ?//
export const SchoolIsActivePhoneUpdateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교에 등록된 발송번호 활성화/비활성화',
      description: `
      - 학교에 등록된 발송번호를 활성화/비활성화 한다.
      `,
    }),
    ApiOkResponseTemplate({
      description: '학교의 활성화된 발송번호 활성화/비활성화 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교의 활성화된 발송번호 삭제
//? ---------------------------------------------------------------------- ?//
export const SchoolPhoneDeleteDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: ' 학교의 등록된 발송번호 삭제 ',
      description: `
      - 학교에 등록된 발송번호를 삭제한다.
      - 학교에 등록된 발송번호가 여러 개일 때, 활성화된 번호는 삭제 할 수 없다. ( 비활성화 번호만 제거 가능 )
      - 단,학교에 등록된 발송번호가 1개일 경우에는 해당 번호가 활성화 되어있어도 삭제가 가능하다.
      `,
    }),
    ApiOkResponseTemplate({
      description: '학교의 발송번호 삭제 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_PHONE_IN_SCHOOL],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.CANNOT_DELETE_ACTIVE_PHONE],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교의 활성화된 발송번호 삭제
//? ---------------------------------------------------------------------- ?//
export const SchoolPhoneDeleteAllDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 모든 발송번호 삭제',
      description: `
      - 학교에 등록된 모든 발송번호를 삭제한다.
      - 활성화된 발송번호가 없으면 로직단에서 Default로 회사번호로 발송되도록 처리.
      `,
    }),
    ApiOkResponseTemplate({
      description: '학교의 모든 발송번호 삭제 완료',
    }),
  );
};
