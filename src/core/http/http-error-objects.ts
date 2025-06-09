/**
 * HTTP error code 관련 상수
 */

export interface HttpErrorFormat {
  error: string;
  description?: string;
  message: string;
}

export const HttpErrorConstants = {
  UNAUTHORIZED: {
    error: 'UNAUTHORIZED',
    message: '로그인이 필요합니다.',
  } as HttpErrorFormat,

  UNAUTHORIZED_USER: {
    error: 'UNAUTHORIZED_USER',
    message: '아이디 또는 비밀번호가 잘못 되었습니다.',
  } as HttpErrorFormat,

  UNAUTHORIZED_COMMENT: {
    error: 'UNAUTHORIZED_COMMENT',
    message: '댓글 작성 권한이 없습니다.',
  } as HttpErrorFormat,

  FORBIDDEN: {
    error: 'FORBIDDEN',
    message: '권한이 없습니다.',
  } as HttpErrorFormat,

  INTERNAL_SERVER_ERROR: {
    error: 'INTERNAL_SERVER_ERROR',
    message: '알 수 없는 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  UNEXPECTED_HTTP_EXCEPTION: {
    error: 'UNEXPECTED_HTTP_EXCEPTION',
    message: '예상치 못한 오류입니다.',
  } as HttpErrorFormat,

  INTERNAL_DATABASE_ERROR: {
    error: 'INTERNAL_DATABASE_ERROR',
    message: '트랜잭션 수행중 에러가 발생하였습니다.',
  } as HttpErrorFormat,

  EXIST_INFO: {
    error: 'EXIST_INFO',
    message: '가입된 정보가 존재합니다.',
  } as HttpErrorFormat,

  EXIST_EMAIL: {
    error: 'EXIST_EMAIL',
    message: '이미 가입된 이메일 정보가 존재합니다.',
  } as HttpErrorFormat,

  VALIDATE_ERROR: {
    error: 'VALIDATE_ERROR',
    message: '입력값이 유효하지 않습니다. 다시 확인해주세요.',
  } as HttpErrorFormat,

  NOT_MATCHED: {
    error: 'NOT_MATCHED',
    message: '요청 코드와 일치하지 않습니다.',
  } as HttpErrorFormat,

  INVALID_TOKEN: {
    error: 'INVALID_TOKEN',
    message: '토큰 검증 실패',
  } as HttpErrorFormat,

  INVALID_TOKEN_FORMAT: {
    error: 'INVALID_TOKEN_FORMAT',
    message: '토큰 포맷이 일치하지 않습니다.',
  } as HttpErrorFormat,

  EXPIRED_ACCESS_TOKEN: {
    error: 'EXPIRED_ACCESS_TOKEN',
    message: '액세스 토큰이 만료되었습니다.',
  } as HttpErrorFormat,

  EXPIRED_REFRESH_TOKEN: {
    error: 'EXPIRED_REFRESH_TOKEN',
    message: '리프레시 토큰이 만료되었습니다. 다시 로그인이 필요합니다.',
  },

  EXPIRED_TOKEN: {
    error: 'EXPIRED_TOKEN',
    message: '토큰이 만료되었습니다.',
  } as HttpErrorFormat,

  INVALID_SIGNATURE: {
    error: 'INVALID_SIGNATURE',
    message: '토큰의 시그니처가 불일치 합니다.',
  } as HttpErrorFormat,

  NOT_FOUND_TOKEN: {
    error: 'NOT_FOUND_TOKEN',
    message: '토큰을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  INVALID_BEARER_TOKEN: {
    error: 'INVALID_BEARER_TOKEN',
    message: '잘못된 토큰 타입입니다.',
  } as HttpErrorFormat,

  TIMEOUT_EXCEPTION: {
    error: 'TIMEOUT_EXCEPTION',
    message: '요청에 대한 응답시간이 초과되었습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_USER: {
    error: 'NOT_FOUND_USER',
    message: '사용자를 찾을수 없습니다.',
  } as HttpErrorFormat,

  NOT_REGISTER_USER: {
    error: 'NOT_REGISTER_USER',
    message: '가입된 유저가 아닙니다.',
  } as HttpErrorFormat,

  INVALID_ROLE: {
    error: 'INVALID_ROLE',
    message: '사용자 유형이 잘못 지정되었습니다.',
  } as HttpErrorFormat,

  INVALID_CONSTRAINT: {
    error: 'INVALID_CONSTRAINT',
    message: '데이터 제약조건 위반 (중복된 이름 등)',
  } as HttpErrorFormat,

  CONDITION_NOT_MET: {
    error: 'CONDITION_NOT_MET',
    message: '처리 조건을 충족하지 않습니다.',
  } as HttpErrorFormat,

  ALREADY_BOOKED: {
    error: 'ALREADY_BOOKED',
    message: '이미 수강신청 접수 중입니다.',
  } as HttpErrorFormat,

  FORBIDDEN_USER_ROLE: {
    error: 'FORBIDDEN_USER_ROLE',
    message: '권한이 없는 유저입니다.',
  } as HttpErrorFormat,

  CONFLICT_STUDENT: {
    error: 'CONFLICT_STUDENT',
    message: '이미 학생 정보가 존재합니다.',
  } as HttpErrorFormat,

  ALREADY_REGISTERED: {
    error: 'ALREADY_REGISTERED',
    message: '이미 가입되었습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_PHONE: {
    error: 'NOT_FOUND_PHONE',
    message: '일치하는 휴대폰번호를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_PHONE_IN_SCHOOL: {
    error: 'NOT_FOUND_PHONE_IN_SCHOOL',
    message: '학교에 속한 번호를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  ACCESS_DENIED: {
    error: 'ACCESS_DENIED',
    message: '접근이 불가한 유저입니다.',
  } as HttpErrorFormat,

  DUPLICATE_TERM: {
    error: 'DUPLICATE_TERM',
    message: '이미 존재하는 학기입니다.',
  } as HttpErrorFormat,

  NOT_FOUND_SCHOOL: {
    error: 'NOT_FOUND_SCHOOL',
    message: '학교를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_SCHOOLDAY: {
    error: 'NOT_FOUND_SCHOOLDAY',
    message: '학교 수업일을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_GROUP: {
    error: 'NOT_FOUND_GROUP',
    message: '그룹(수업)을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_TERM: {
    error: 'NOT_FOUND_TERM',
    message: '학기를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_LESSON: {
    error: 'NOT_FOUND_LESSON',
    message: '과목을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_PASSWORD: {
    error: 'NOT_FOUND_PASSWORD',
    message: '비밀번호가 존재하지 않습니다.',
  } as HttpErrorFormat,

  INVALID_QUERY_PARAMS: {
    error: 'INVALID_QUERY_PARAMS',
    message: '쿼리 파라미터가 유효하지 않습니다.',
  } as HttpErrorFormat,

  INVALID_CREDENTIALS: {
    error: 'INVALID_CREDENTIALS',
    message: '인증정보가 불일치합니다.',
  } as HttpErrorFormat,

  DUPLICATE_PHONE: {
    error: 'DUPLICATE_PHONE',
    message: '이미 존재하는 휴대폰번호입니다.',
  } as HttpErrorFormat,

  DUPLICATE_LESSON: {
    error: 'DUPLICATE_LESSON',
    message: '이미 존재하는 과목입니다.',
  } as HttpErrorFormat,

  NOT_FOUND_STUDENT: {
    error: 'NOT_FOUND_STUDENT',
    message: '학생을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_INSTRUCTOR_SCHOOL: {
    error: 'NOT_FOUND_INSTRUCTOR_SCHOOL',
    message: '학교에 속한 강사를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_ENTITY: {
    error: 'NOT_FOUND_ENTITY',
    message: '존재하지 않는 엔터티입니다.',
  } as HttpErrorFormat,

  CANNOT_DELETE_ACTIVE_PHONE: {
    error: 'CANNOT_DELETE_ACTIVE_PHONE',
    message:
      '대표번호는 삭제할 수 없습니다. 다른 번호를 대표번호로 설정 후 삭제해 주세요.',
  } as HttpErrorFormat,

  NOT_FOUND_BOARD: {
    error: 'NOT_FOUND_BOARD',
    message: '게시글을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_STATUS: {
    error: 'NOT_FOUND_STATUS',
    message: '학생의 수업 정보를 가져올 수 없습니다.',
  } as HttpErrorFormat,

  STUDENT_COURSE_STATUS_NOT_FOUND: {
    error: 'STUDENT_COURSE_STATUS_NOT_FOUND',
    message: '요청하신 수업 상태에 대한 정보를 찾을 수 없습니다.',
  } as HttpErrorFormat,

  NOT_FOUND_COMMENT: {
    error: 'NOT_FOUND_COMMENT',
    message: '댓글을 찾을 수 없습니다.',
  } as HttpErrorFormat,

  OUT_OF_RANGE: {
    error: 'OUT_OF_RANGE',
    message: '입력값이 허용 범위를 벗어났습니다.',
  } as HttpErrorFormat,

  NO_CLASS_DAY: {
    error: 'NO_CLASS_DAY',
    message: '해당일에 수업이 없습니다.',
  } as HttpErrorFormat,

  DATABASE_QUERY_ERROR: {
    error: 'DATABASE_QUERY_ERROR',
    message: 'Database Query 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  DYNAMO_READ: {
    error: 'DYNAMO_READ',
    message: 'DynamoDB 읽기 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  DYNAMO_CREATE: {
    error: 'DYNAMO_CREATE',
    message: 'DynamoDB 생성 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  DYNAMO_UPDATE: {
    error: 'DYNAMO_UPDATE',
    message: 'DynamoDB 수정 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  DYNAMO_DELETE: {
    error: 'DYNAMO_DELETE',
    message: 'DynamoDB 삭제 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  ALIGO_FAILED: {
    error: 'ALIGO_FAILED',
    message: '알리고 SaaS 서비스 호출시 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  SQS_ERROR: {
    error: 'SQS_ERROR',
    message: 'SQS 에서 오류가 발생하였습니다.',
  } as HttpErrorFormat,

  INVALID_PUSH_TOKEN: {
    error: 'INVALID_PUSH_TOKEN',
    message: 'PUSH TOKEN 이 유효하지 않습니다.',
  } as HttpErrorFormat,

  PUSH_FAILED: {
    error: 'PUSH_FAILED',
    message: '푸시 알림 전송에 실패하였습니다.',
  } as HttpErrorFormat,

  COMMON_UNAUTHORIZED_TOKEN_ERROR: [] as HttpErrorFormat[], // 공통(bearer Access Token Error Template)
};

HttpErrorConstants.COMMON_UNAUTHORIZED_TOKEN_ERROR = [
  HttpErrorConstants.NOT_FOUND_TOKEN,
  HttpErrorConstants.INVALID_TOKEN,
  HttpErrorConstants.EXPIRED_TOKEN,
  HttpErrorConstants.INVALID_TOKEN_FORMAT,
  HttpErrorConstants.INVALID_SIGNATURE,
];
