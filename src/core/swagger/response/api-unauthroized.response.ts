import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from '../../http/http-error-objects';

/** 로그인 필요시 반환하는 Error Response */
export const ApiUnauthorizedErrorResponse = () => {
  return applyDecorators(
    ApiResponse({
      status: StatusCodes.UNAUTHORIZED,
      description: `토큰 인증관련 에러.(상세내용은 Summary 참고)`,
      content: {
        'application/json': {
          examples: {
            case_1: {
              summary:
                '엑세스 토큰 만료, 리프레시 토큰으로 엑세스 토큰 재발급 필요',
              value: {
                status: StatusCodes.UNAUTHORIZED,
                message: HttpErrorConstants.EXPIRED_ACCESS_TOKEN.message,
                error: HttpErrorConstants.EXPIRED_ACCESS_TOKEN.error,
              },
            },
            case_2: {
              summary: '전달받은 토큰의 타입이 엑세스토큰이 아님.',
              value: {
                status: StatusCodes.UNAUTHORIZED,
                message: HttpErrorConstants.NOT_COLLETED_ACCESS_TYPE.message,
                error: HttpErrorConstants.NOT_COLLETED_ACCESS_TYPE.error,
              },
            },
            case_3: {
              summary: '토큰을 찾을 수 없음.',
              value: {
                status: StatusCodes.UNAUTHORIZED,
                message: HttpErrorConstants.NOT_FOUND_TOKEN.message,
                error: HttpErrorConstants.NOT_FOUND_TOKEN.error,
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: StatusCodes.BAD_REQUEST,
      description: `Bearer Token 양식이 아님, Header의 형태가 잘못된 경우.`,
      content: {
        'application/json': {
          example: {
            status: StatusCodes.BAD_REQUEST,
            message: HttpErrorConstants.INVALID_BEARER_TOKEN.message,
            error: HttpErrorConstants.INVALID_BEARER_TOKEN.error,
          },
        },
      },
    }),
  );
};
