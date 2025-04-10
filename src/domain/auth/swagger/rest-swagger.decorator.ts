import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { UserCredentialsDto } from '../dto/user-credentials.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { HttpResponse } from 'src/core/http/http-response';
import { AuthResponseDTO } from '../dto/auth-response.dto';

//? ----------------------------------------------------------------------- //
//? Public) 가입, 이메일인증, 비번재설정 Docs
//? ----------------------------------------------------------------------- //
export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '회원가입',
      description: `
      - 회원가입은 유형별로 총 3가지( MANAGER, PARENT, INSTRUCTOR )로 가입이 되며, 최초 가입된 사용자는 user entity에 적재되고, 그 이후 user 정보에서 role이 upsert 됨.
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
    }),
    ApiCreatedResponseTemplate({
      description: '회원가입',
      type: AuthResponseDTO,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.INVALID_ROLE,
          HttpErrorConstants.ALREADY_REGISTERED,
        ],
      },
    ]),
  );
};

export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '비밀번호 재설정',
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

//? ----------------------------------------------------------------------- //
//? Public) 로그인 Docs
//? ----------------------------------------------------------------------- //
export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '로그인',
      description: ` 
      - phone & role 기반 로그인
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
    }),
    ApiCreatedResponseTemplate({
      description: '로그인 성공',
      type: AuthResponseDTO,
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
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.INVALID_CREDENTIALS],
      },
    ]),
  );
};

//? ----------------------------------------------------------------------- //
//?  토큰 refresh Docs
//? ----------------------------------------------------------------------- //
export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'AccessToken 갱신',
      description: `
      - RefreshToken을 기반으로 AccessToken 토큰을 갱신한다.
      - Bearer Refresh Token을 Header에 담아 요청한다. 
      - production 환경에서만 Secure 옵션을 true로 활성화한다.
      `,
    }),
    ApiCreatedResponseTemplate({
      description: ' Access Token 재발급 성공 ',
      type: AuthResponseDTO,
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

//? ----------------------------------------------------------------------- //
//? 로그아웃 Docs
//? ----------------------------------------------------------------------- //
export const LogOutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '사용자 로그아웃',
      description: `
      - Bearer Token 기반 로그아웃`,
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
