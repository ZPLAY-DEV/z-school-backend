import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { RefreshResponseDto } from 'src/domain/auth/dto/refresh-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from '../dto/user-credentials.dto';

//? ---------------------------------------------------------------------- ?//
//? Public) 부모/강사 회원가입
//? ---------------------------------------------------------------------- ?//
export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '부모/강사 회원가입',
      description: `
      - 회원가입 유형중 PARENT, INSTRUCTOR 로 가입 API, 최초 가입된 사용자는 user entity에 적재되고, 그 이후 user 정보에서 role이 upsert 됨.
      - httpOnly쿠키로 accessToken 과 refreshToken 을 반환한다.
      - Response 에도 accessToken 과 refreshToken 을 반환한다. (변동가능)
      `,
    }),
    ApiBody({
      type: UserCredentialsDtoWithPhone,
    }),
    ApiCreatedResponseTemplate({
      description: '부모/강사 회원가입',
      type: AuthResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.ALREADY_REGISTERED,
          HttpErrorConstants.INTERNAL_DATABASE_ERROR,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Public) 매니저 회원 가입
//? ---------------------------------------------------------------------- ?//
export const RegisterManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '매니저 회원가입',
      description: `
      - 회원가입 유형 중 MANAGER 전용 가입 API, 최초 가입된 사용자는 user entity에 적재되고, 그 이후 user 정보에서 role이 upsert 됨.
      - httpOnly쿠키로 accessToken 과 refreshToken 을 반환한다.
      - Response 에도 accessToken 과 refreshToken 을 반환한다. (변동가능)
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
    }),
    ApiCreatedResponseTemplate({
      description: '매니저 회원가입',
      type: AuthResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.ALREADY_REGISTERED,
          HttpErrorConstants.INTERNAL_DATABASE_ERROR,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Public) 비밀번호 재설정
//? ---------------------------------------------------------------------- ?//
export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '비밀번호 재설정',
      description: `
      - 부모/강사 회원만 사용가능.
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
    }),
    ApiOkResponseTemplate({
      description: '비밀번호 재설정',
      type: HttpResponse,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_PHONE],
      },
      {},
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Public) 로그인 Docs
//? ---------------------------------------------------------------------- ?//
export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '로그인',
      description: ` 
      - username, password, 그리고 role 을 제공하여 로그인
      - httpOnly쿠키로 accessToken 과 refreshToken 을 반환한다.
      - Response 에도 accessToken 과 refreshToken 을 반환한다.
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
    }),
    ApiCreatedResponseTemplate({
      description: '로그인 성공',
      type: AuthResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_PHONE],
      },
      {
        status: StatusCodes.FORBIDDEN,
        errorFormatList: [
          HttpErrorConstants.ACCESS_DENIED,
          HttpErrorConstants.NOT_FOUND_PASSWORD,
          HttpErrorConstants.INVALID_CREDENTIALS,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//?  토큰 refresh Docs
//? ---------------------------------------------------------------------- ?//
export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'AccessToken 갱신',
      description: `
      - Cookie 에 refreshToken 이 있거나
        Bearer Token 형식의 Authorization 헤더 안에 refreshToken 이 존재해야한다.
      - Post 호출.
      - Body 는 null.
      `,
    }),
    ApiCreatedResponseTemplate({
      description: ' Access Token 재발급 성공 ',
      type: RefreshResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.FORBIDDEN,
        errorFormatList: [
          HttpErrorConstants.ACCESS_DENIED,
          HttpErrorConstants.INVALID_SIGNATURE,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 로그아웃 Docs
//? ---------------------------------------------------------------------- ?//
export const LogOutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '사용자 로그아웃',
      description: `
      - Authorization 헤더가 존재하는 경우 아무 인자없이 Post 호출가능
      - Body 에 refreshToken 을 포함하는 경우, 특정 사용자만 로그아웃 가능
      - Body 에 refreshToken 을 포함하지 않는 경우, 모든 사용자 로그아웃
      - 둘다 없이 호출하면 예외 발생
      `,
    }),
    ApiOkResponseTemplate({
      description: '로그아웃 성공',
      type: HttpResponse,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_USER],
      },
    ]),
  );
};
