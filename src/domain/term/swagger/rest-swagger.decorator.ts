//? ---------------------------------------------------------------------- ?//
//? Public) 부모/강사 회원가입

import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { CreateTermDto } from '../dto/create-term.dto';
import { TermResponseDto } from '../dto/term-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Private) 학기 생성
//? ---------------------------------------------------------------------- ?//
export const CreateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '운영기간관리 생성',
      description: `
      - 학교에 귀속된 운영기간관리를 생성.
      - 날짜 형식은 YYYY-MM-DD 형식으로 입력.
      - 기간 시작일이 종료일 보다 앞서야 함 -> 시작일보다 종료일이 앞설 경우 400 Validation Error 발생.
      `,
    }),
    ApiBody({
      type: CreateTermDto,
    }),
    ApiCreatedResponseTemplate({
      description: 'Term 생성 완료',
      type: TermResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.DUPLICATE_TERM,
        ],
      },
    ]),
  );
};
