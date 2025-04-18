import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { HttpResponse } from 'src/core/http/http-response';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
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
      - App 에서 사용하는 부모 또는 강사 회원가입용.
      - 같은 Role 로 중복가입시 오류 발생.
      - 가입 후 바로 로그인 처리됨.
      - httpOnly 쿠키 및 Response 로 accessToken 과 refreshToken 을 반환.
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
      - Web 에서 사용하는 매니저 회원가입용.
      - 같은 Role 로 중복가입시 오류 발생.
      - 가입 후 바로 로그인 처리됨.
      - httpOnly 쿠키 및 Response 로 accessToken 과 refreshToken 을 반환.
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
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_PHONE,
          HttpErrorConstants.NOT_FOUND_USER,
        ],
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
      - httpOnly 쿠키 및 Response 로 accessToken 과 refreshToken 을 반환.
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
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
        status: StatusCodes.UNAUTHORIZED,
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
      - Bearer Token 형식의 헤더 또는 Cookie 에 refreshToken 이 존재해야한다.
      - Body 는 null.
      `,
    }),
    ApiCreatedResponseTemplate({
      description: ' Access Token 재발급 성공 ',
      type: RefreshResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.UNAUTHORIZED,
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
      - Body 에 refreshToken 을 제공하면, 특정 사용자의 디바이스만 로그아웃
      - Body 에 refreshToken 을 제공하지 않으면, 사용자의 모든 디바이스 로그아웃
      `,
    }),
    ApiBody({
      type: LogoutDto,
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
