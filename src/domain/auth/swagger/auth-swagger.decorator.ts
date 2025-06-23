import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { AuthUserDto } from 'src/domain/auth/dto/auth-user.dto';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import {
  UserCredentialsDto,
  UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';

//? ---------------------------------------------------------------------- ?//
//? Register
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
      - refreshToken 은 쿠키에 저장되고, accessToken만 응답 값으로 반환됨.
      - 필수 정보: phone, password, role
      - username 은 선택 사항이며, 생략한 경우, phone 값을 사용.
      - phone 은 11자리 숫자로 입력.
      `,
    }),
    ApiBody({
      type: UserCredentialsDtoWithPhone,
    }),
    ApiCreatedResponseTemplate({
      description: '부모/강사 회원가입 성공',
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? RegisterManager
//? ---------------------------------------------------------------------- ?//

export const RegisterManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '매니저 회원가입',
      description: `
      - Web 에서 사용하는 매니저 회원가입용.
      - 같은 Role 로 중복가입시 오류 발생.
      - 가입 후 바로 로그인 처리됨.
      - 필수 정보: username, password, role 3개
      - httpOnly 쿠키 및 Response 로 accessToken 과 refreshToken 을 반환.
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
    }),
    ApiCreatedResponseTemplate({
      description: '매니저 회원가입',
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Reset Password
//? ---------------------------------------------------------------------- ?//

export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '비밀번호 재설정',
      description: `
      - 부모/강사 회원만 사용가능.
      - return Promise<void> statusCode 200
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Login
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
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.UNAUTHORIZED),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Login with Nanoid
//? ---------------------------------------------------------------------- ?//

export const LoginWithNanoidDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Nanoid 로그인',
      description: `
      - Nanoid를 사용한 로그인 방식.
      - Path parameter로 nanoid를 전달.
      - httpOnly 쿠키 및 Response 로 accessToken 과 refreshToken 을 반환.
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'Nanoid 값',
      type: String,
      example: 'abc123def456',
    }),
    ApiCreatedResponseTemplate({
      description: 'Nanoid 로그인 성공',
      type: AuthUserDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.UNAUTHORIZED),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Refresh
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
      type: AuthTokenDto,
    }),
    ApiStatuses(StatusCodes.UNAUTHORIZED),
  );
};

//? ---------------------------------------------------------------------- ?//
//? LogOut
//? ---------------------------------------------------------------------- ?//

export const LogOutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '사용자 로그아웃',
      description: `
      - Body 에 refreshToken 을 제공하면, 특정 사용자의 디바이스만 로그아웃
      - Body 에 refreshToken 을 제공하지 않으면, 사용자의 모든 디바이스 로그아웃
      - return Promise<void> statusCode 200
      `,
    }),
    ApiBody({
      type: LogoutDto,
    }),
    ApiOkResponseTemplate({
      description: '로그아웃 성공',
      type: String,
    }),
    ApiStatuses(StatusCodes.UNAUTHORIZED),
  );
};
