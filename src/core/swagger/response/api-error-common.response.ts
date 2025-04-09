import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';

/** 공용으로 사용하는 Common Error Response Handler */
export const ApiCommonErrorResponseTemplate = () => {
  return applyDecorators(
    ApiResponse({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      description:
        '서버에서 예외처리하지 않은 에러 발생시 ( 500에러 발생시 별도로 요청.)',
      content: {
        'application/json': {
          example: {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            message: '서버에서 에러가 발생했습니다. 관리자에게 문의해주세요.',
            error: 'INTERNAL_SERVER_ERROR',
          },
        },
      },
    }),
  );
};
