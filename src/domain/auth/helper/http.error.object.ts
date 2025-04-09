import { HttpErrorFormat } from 'src/core/http/http-error-objects';

export const HttpErrorConstants = {
  INVALID_ROLE: {
    error: 'INVALID_ROLE',
    message: '가입 가능한 유형이 아닙니다.',
  } as HttpErrorFormat,

  ALREADY_REGISTERED: {
    error: 'ALREADY_REGISTERED',
    message: '이미 가입되었습니다.',
  } as HttpErrorFormat,

  ERR_INVALID_PARAMS: {
    error: 'ERR_INVALID_PARAMS',
    message: '잘못된 파라미터 입니다.',
  } as HttpErrorFormat,

  USER_LOGIN_FAIL: {
    error: 'USER_LOGIN_FAIL',
    message: '로그인에 실패했습니다. 다시 시도해주세요.',
  } as HttpErrorFormat,

  AUTH_TOKEN_INVALID: {
    error: 'AUTH_TOKEN_INVALID',
    message: '사용할 수 없는 토큰입니다.',
  } as HttpErrorFormat,

  NOT_FOUND_PHONE: {
    error: 'NOT_FOUND_PHONE',
    message: '일치하는 휴대폰번호를 찾을 수 없습니다.',
  } as HttpErrorFormat,
};
