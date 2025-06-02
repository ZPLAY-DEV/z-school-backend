import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';

//? ---------------------------------------------------------------------- ?//
//? Create School Calendar
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolCalendarDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 캘린더 👈 생성 (NEIS API 연동)',
      description: `
      - 지정된 학교의 캘린더 정보를 NEIS API를 통해 가져와서 생성.
      - NEIS(나이스) 교육행정정보시스템에서 학사일정 데이터를 조회하여 저장.
      - 현재 날짜부터 9개월 후까지의 학사일정을 조회.
      - 중복된 날짜의 경우 기존 데이터를 업데이트.
      - 성공시 생성/업데이트된 캘린더 항목의 개수를 반환.
      
      ### NEIS API 연동 특징:
      - 휴일, 행사일, 개교기념일 등의 학사일정 자동 동기화
      - 실시간 교육청 데이터와 동기화
      - 학교별 고유한 학사일정 반영
      `,
    }),
    ApiCreatedResponse({
      description: '학교 캘린더 생성 완료',
      schema: {
        type: 'number',
        example: 42,
        description: '생성/업데이트된 캘린더 항목 수',
      },
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
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_SERVER_ERROR],
      },
    ]),
  );
};
