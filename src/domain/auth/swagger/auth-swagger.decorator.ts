import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { AuthUserDto } from 'src/domain/auth/dto/auth-user.dto';
import { LoginResponseDto } from 'src/domain/auth/dto/login-response.dto';
import { LogoutDto } from 'src/domain/auth/dto/logout.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import { SwitchSchoolDto } from 'src/domain/auth/dto/switch-school.dto';
import {
    UserCredentialsDto,
    UserCredentialsDtoWithPhone,
} from 'src/domain/auth/dto/user-credentials.dto';
import { UserDto } from 'src/domain/auth/dto/user.dto';

//? ---------------------------------------------------------------------- ?//
//? User Registration (Parents/Instructors)
//? ---------------------------------------------------------------------- ?//

export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학부모/강사 회원가입',
      description: `
### 📝 기능 설명
모바일 애플리케이션을 통한 학부모 또는 강사 계정 생성. 회원가입 성공 시 자동 로그인 처리.

### 🔄 비즈니스 로직
- 학부모 또는 강사 역할로 새 사용자 계정 생성
- 전화번호 중복 검증 (동일 역할 내 중복 가입 방지)
- 회원가입 성공 시 자동 로그인 처리
- 액세스 토큰과 리프레시 토큰을 위한 안전한 HTTP-only 쿠키 설정
- 사용자명이 제공되지 않으면 전화번호를 기본 사용자명으로 사용
- 저장 전 비밀번호 안전한 암호화 해싱
- 전화번호는 한국 형식의 정확히 11자리 숫자여야 함

### 🔐 보안 기능
- HTTP-only 쿠키로 XSS 공격 방지
- 프로덕션 환경에서 안전한 쿠키 설정
- CSRF 보호를 위한 SameSite 쿠키 정책
- 토큰 만료: 액세스 토큰 (1시간), 리프레시 토큰 (30일)
- 안전한 저장을 위한 솔트가 포함된 비밀번호 해싱

### 💡 사용 시나리오
- 학생 관리를 위한 새 학부모 가입
- 강의 서비스를 위한 강사 계정 생성
- 모바일 앱 사용자 온보딩 프로세스
- 최초 사용자 인증 설정

### 📱 쿠키 관리
- **액세스 토큰**: HTTP-only 쿠키에 저장, 1시간 후 만료
- **리프레시 토큰**: HTTP-only 쿠키에 저장, 30일 후 만료
- 두 토큰 모두 클라이언트 접근을 위해 응답 본문에도 반환
- 로그아웃 시 자동 쿠키 삭제

### 📝 상세 응답 예시
\`\`\`json
{
  "success": true,
  "user": {
    "id": 123,
    "username": "01012345678",
    "phone": "01012345678",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "role": "PARENT",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_123_P_randomString"
}
\`\`\`

### ⚠️ 오류 조건
- **400 Bad Request**: 잘못된 전화번호 형식, 필수 필드 누락, 중복 사용자
- **422 Validation Error**: 비밀번호가 너무 약함, 잘못된 역할 지정
      `,
    }),
    ApiBody({
      type: UserCredentialsDtoWithPhone,
      description: '전화번호가 포함된 사용자 회원가입 데이터',
    }),
    ApiCreatedResponseTemplate({
      description: '✅ 사용자 회원가입 성공 (자동 로그인)',
      type: LoginResponseDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Manager Registration
//? ---------------------------------------------------------------------- ?//

export const RegisterManagerDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👨‍💼 매니저 계정 회원가입',
      description: `
### 📝 기능 설명
웹 기반 관리자 접근을 위한 새 매니저 계정 생성. 내부 직원 등록을 위해 설계된 엔드포인트로 높은 권한을 가집니다.

### 🔄 비즈니스 로직
- 관리자 권한으로 매니저 계정 생성
- 전화번호 대신 사용자명 필요 (웹 기반 인터페이스)
- 매니저 역할 범위 내에서 고유한 사용자명 검증
- 성공적인 생성 시 자동 사용자 인증
- 웹 세션 관리를 위한 안전한 인증 쿠키 설정
- 매니저 계정은 학부모/강사 계정과 다른 권한을 가짐

### 🎯 매니저 역할 권한
- 관리자 대시보드 접근
- 학생 및 강사 관리 기능
- 재무 보고서 및 분석
- 시스템 구성 및 설정
- 대량 작업 및 데이터 내보내기

### 💡 사용 시나리오
- 새 관리자 온보딩
- 직원 계정 프로비저닝
- 관리자 접근 설정
- 내부 사용자 관리

### 🔐 보안 고려사항
- 웹 인터페이스를 위한 사용자명 기반 인증
- 사용자 등록과 동일한 보안 표준
- 역할 기반 접근 제어 구현
- 관리자 세션 관리

### 📝 상세 응답 예시
\`\`\`json
{
  "success": true,
  "user": {
    "id": 456,
    "username": "manager.kim",
    "role": "MANAGER",
    "phone": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_456_M_randomString"
}
\`\`\`

### ⚠️ 오류 조건
- **400 Bad Request**: 잘못된 사용자명 형식, 자격 증명 누락
- **409 Conflict**: 매니저 역할에 사용자명이 이미 존재
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
      description: '매니저 계정 자격 증명 (사용자명, 비밀번호, 역할)',
    }),
    ApiCreatedResponseTemplate({
      description: '✅ 매니저 계정 생성 및 인증 성공',
      type: LoginResponseDto,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Password Reset
//? ---------------------------------------------------------------------- ?//

export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔑 비밀번호 재설정',
      description: `
### 📝 기능 설명
학부모 및 강사 계정의 비밀번호 재설정. 사용자가 비밀번호를 잊었거나 보안상의 이유로 변경해야 할 때 사용할 수 있습니다.

### 🔄 비즈니스 로직
- 전화번호 또는 사용자명을 통한 사용자 신원 검증
- 새 해시된 값으로 비밀번호 업데이트
- 보안을 위해 모든 기존 리프레시 토큰 무효화
- 유효한 검증 프로세스 필요 (OTP, 이메일 검증 등)
- PARENT 및 INSTRUCTOR 역할에만 사용 가능
- 매니저 비밀번호 재설정은 별도의 관리자 프로세스 필요

### 🔐 보안 프로세스
- 저장 전 HashPasswordPipe를 사용하여 비밀번호 해싱
- 비밀번호 변경 시 모든 기존 세션 무효화
- 비밀번호 재설정 후 새 로그인 필요
- 비밀번호 업데이트 전 검증 토큰 검증
- 브루트 포스 공격 방지를 위한 속도 제한

### 💡 사용 시나리오
- 잊어버린 비밀번호 복구
- 보안상의 이유로 비밀번호 변경
- 계정 침해 후 복구
- 정기적인 비밀번호 교체 정책

### 📱 재설정 후 작업
- 새 비밀번호로 다시 로그인해야 함
- 모든 디바이스에서 자동 로그아웃
- 새 인증 토큰을 얻어야 함
- 비밀번호 변경 알림 이메일/SMS (선택사항)

### 📝 요청 예시
\`\`\`json
{
  "phone": "01012345678",
  "password": "newSecurePassword123!"
}
\`\`\`

### ✅ 성공 응답
- **상태**: 200 OK
- **본문**: 비어있음 (void 응답)
- **작업**: 비밀번호가 성공적으로 업데이트됨

### ⚠️ 오류 조건
- **404 Not Found**: 제공된 전화번호/사용자명을 가진 사용자가 존재하지 않음
- **400 Bad Request**: 잘못된 검증 코드, 약한 비밀번호
- **429 Too Many Requests**: 비밀번호 재설정 시도 횟수 제한 초과
      `,
    }),
    ApiBody({
      type: ResetPasswordDto,
      description: '검증이 포함된 비밀번호 재설정 요청',
    }),
    ApiOkResponseTemplate({
      description: '✅ 비밀번호 재설정이 성공적으로 완료됨',
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.TOO_MANY_REQUESTS,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? User Login
//? ---------------------------------------------------------------------- ?//

export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔐 사용자 인증 로그인',
      description: `
### 📝 기능 설명
사용자명/전화번호와 비밀번호 자격 증명으로 사용자 인증. 모든 사용자 역할(학부모, 강사, 매니저)의 로그인을 처리하고 안전한 인증 세션을 설정합니다.

### 🔄 비즈니스 로직
- 저장된 해시와 비교하여 사용자 자격 증명 검증
- 새로운 액세스 토큰과 리프레시 토큰 쌍 생성
- 웹 클라이언트를 위한 안전한 HTTP-only 쿠키 설정
- 모바일/API 클라이언트를 위해 응답에 토큰 반환
- 마지막 로그인 타임스탬프 업데이트
- 사용자당 여러 디바이스 세션 처리

### 🔐 인증 흐름
1. **자격 증명 검증**: 사용자명/전화번호와 비밀번호 확인
2. **토큰 생성**: JWT 액세스 토큰과 리프레시 토큰 생성
3. **세션 생성**: Redis/데이터베이스에 세션 정보 저장
4. **쿠키 설정**: 브라우저 클라이언트를 위한 HTTP-only 쿠키 설정
5. **응답**: 사용자 데이터와 토큰 반환

### 💡 다중 플랫폼 지원
- **웹 브라우저**: 자동으로 HTTP-only 쿠키 사용
- **모바일 앱**: 응답 본문의 토큰 사용
- **API 클라이언트**: 쿠키 또는 Authorization 헤더 사용 가능
- **크로스 도메인**: 다른 클라이언트 출처에 대해 CORS 준수

### 🕐 토큰 생명주기
- **액세스 토큰**: 1시간 만료, 사용자 클레임 포함
- **리프레시 토큰**: 30일 만료, 토큰 갱신에 사용
- **세션 저장소**: 빠른 조회 및 무효화를 위한 Redis
- **자동 정리**: 만료된 토큰을 주기적으로 제거

### 📝 상세 응답 예시
\`\`\`json
{
  "success": true,
  "user": {
    "id": 789,
    "username": "parent123",
    "phone": "01012345678",
    "lastLoginAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "role": "PARENT",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc4OSwicm9sZSI6IlBBUkVOVCIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ...",
  "refreshToken": "refresh_789_P_abcd1234efgh5678ijkl9012"
}
\`\`\`

### ⚠️ 오류 조건
- **404 Not Found**: 사용자가 존재하지 않음
- **401 Unauthorized**: 잘못된 비밀번호, 계정 비활성화
- **423 Locked**: 실패한 시도로 인한 임시 계정 잠금
      `,
    }),
    ApiBody({
      type: UserCredentialsDto,
      description: '사용자 로그인 자격 증명 (사용자명/전화번호와 비밀번호)',
    }),
    ApiOkResponseTemplate({
      description: '✅ 사용자 인증 성공',
      type: LoginResponseDto,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.LOCKED,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Nanoid Login
//? ---------------------------------------------------------------------- ?//

export const LoginWithNanoidDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🆔 Nanoid 기반 인증',
      description: `
### 📝 기능 설명
전통적인 사용자명/비밀번호 대신 고유한 Nanoid 토큰을 사용하여 사용자 인증. QR 코드 로그인이나 임시 접근과 같은 특정 사용 사례를 위한 비밀번호 없는 인증을 제공합니다.

### 🔄 비즈니스 로직
- 저장된 사용자 기록과 제공된 Nanoid 검증
- Nanoid는 인증을 위한 임시적이고 고유한 식별자 역할
- 성공적인 검증 시 표준 액세스 토큰과 리프레시 토큰 생성
- 일반 로그인과 동일한 세션 관리
- 보안을 위해 Nanoid에 만료 시간이 있을 수 있음

### 🎯 사용 사례
- **QR 코드 인증**: QR 스캔을 통한 모바일 앱 로그인
- **임시 접근**: 게스트 또는 제한된 시간 사용자 접근
- **디바이스 페어링**: 비밀번호 입력 없이 새 디바이스 연결
- **관리 도구**: 생성된 토큰으로 내부 시스템 접근
- **매직 링크 로그인**: 이메일 기반 비밀번호 없는 인증

### 🔐 보안 고려사항
- Nanoid는 암호학적으로 안전한 랜덤 문자열
- 제한된 사용 횟수 (일회용 또는 시간 제한)
- 추측하거나 브루트 포스할 수 없음
- 사용 후 또는 시간 초과 시 자동 만료
- Nanoid 기반 로그인에 대한 감사 로깅

### 📱 통합 예시
- 모바일 앱이 Nanoid로 QR 코드 생성
- 사용자가 QR 코드를 스캔하여 웹에서 인증
- Nanoid 접근을 가진 임시 직원 계정
- 비밀번호 복구 대안 방법

### 📝 요청 매개변수
\`\`\`
GET /auth/login/nanoid/abc123def456ghi789
\`\`\`

### 📝 상세 응답 예시
\`\`\`json
{
  "user": {
    "id": 101,
    "username": "temp.user",
    "role": "INSTRUCTOR",
    "phone": "01098765432",
    "lastLoginAt": "2024-01-01T15:30:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_101_I_nanoid_xyz789"
}
\`\`\`

### ⚠️ 오류 조건
- **404 Not Found**: 잘못되었거나 만료된 Nanoid
- **401 Unauthorized**: Nanoid가 이미 사용되었거나 계정 비활성화
- **410 Gone**: Nanoid가 복구할 수 없을 정도로 만료됨
      `,
    }),
    ApiParam({
      name: 'id',
      description: '인증을 위한 고유 Nanoid 토큰',
      type: String,
      example: 'abc123def456ghi789xyz',
    }),
    ApiOkResponseTemplate({
      description: '✅ Nanoid 인증 성공',
      type: AuthUserDto,
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.GONE,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Token Refresh
//? ---------------------------------------------------------------------- ?//

export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 액세스 토큰 갱신',
      description: `
### 📝 기능 설명
유효한 리프레시 토큰을 사용하여 만료된 액세스 토큰 갱신. 재인증 없이 사용자 세션을 유지하여 애플리케이션 전반에 걸쳐 원활한 사용자 경험을 제공합니다.

### 🔄 비즈니스 로직
- 쿠키 또는 Authorization 헤더에서 리프레시 토큰 검증
- 리프레시 토큰 구조에서 사용자 ID와 역할 추출
- 업데이트된 만료 시간으로 새 액세스 토큰 생성
- 동일한 리프레시 토큰 유지 (이 구현에서는 로테이션 없음)
- 액세스 토큰 쿠키 자동 업데이트
- 사용자 세션 상태와 권한 보존

### 🔐 토큰 검증 프로세스
1. **토큰 추출**: 쿠키 또는 Bearer 헤더에서
2. **형식 검증**: 토큰 구조 확인 (refresh_userId_role_hash)
3. **데이터베이스 확인**: 토큰이 존재하고 유효한지 확인
4. **사용자 검증**: 사용자 계정이 여전히 활성 상태인지 확인
5. **새 토큰 생성**: 새로운 액세스 토큰 생성
6. **쿠키 업데이트**: HTTP-only 쿠키에 새 액세스 토큰 설정

### 💡 클라이언트 통합
- **자동 갱신**: 모바일 앱이 토큰을 투명하게 갱신 가능
- **백그라운드 갱신**: 웹 앱이 만료 전에 토큰 갱신
- **오류 복구**: 토큰 갱신 실패를 우아하게 처리
- **폴백 인증**: 갱신 실패 시 로그인으로 리다이렉트

### 🕐 토큰 관리
- **액세스 토큰**: 1시간 만료로 새 토큰
- **리프레시 토큰**: 변경 없음, 원래 만료 시간 유지
- **세션 연속성**: 사용자가 원활하게 로그인 상태 유지
- **보안**: 보안을 위해 액세스 토큰만 갱신

### 📝 요청 방법
\`\`\`bash
# 쿠키 사용 (자동)
POST /auth/refresh
Cookie: refreshToken=refresh_123_P_abc...

# Authorization 헤더 사용
POST /auth/refresh
Authorization: Bearer refresh_123_P_abc...
\`\`\`

### 📝 상세 응답 예시
\`\`\`json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6IlBBUkVOVCIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ..."
}
\`\`\`

### ⚠️ 오류 조건
- **401 Unauthorized**: 잘못되었거나 만료되었거나 형식이 잘못된 리프레시 토큰
- **403 Forbidden**: 사용자 계정 비활성화 또는 역할 변경
- **404 Not Found**: 토큰과 연결된 사용자가 더 이상 존재하지 않음
      `,
    }),
    ApiOkResponseTemplate({
      description: '✅ 액세스 토큰이 성공적으로 갱신됨',
      type: AuthTokenDto,
    }),
    ApiStatuses(
      StatusCodes.UNAUTHORIZED,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? User Logout
//? ---------------------------------------------------------------------- ?//

export const LogOutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👋 사용자 세션 로그아웃',
      description: `
### 📝 기능 설명
단일 디바이스 또는 모든 디바이스 로그아웃 옵션으로 사용자 인증 세션 종료. 안전한 세션 관리와 토큰 무효화를 제공합니다.

### 🔄 비즈니스 로직
- **선택적 로그아웃**: 리프레시 토큰을 제공하여 특정 디바이스만 로그아웃
- **전체 로그아웃**: 리프레시 토큰을 생략하여 모든 디바이스에서 로그아웃
- 데이터베이스/Redis에서 지정된 리프레시 토큰 무효화
- HTTP-only 인증 쿠키 삭제
- 우아한 오류 처리 (잘못된 토큰이 있어도 성공)
- 보안 모니터링을 위한 감사 로깅

### 🎯 로그아웃 시나리오
1. **단일 디바이스 로그아웃**: 사용자가 현재 디바이스에서만 로그아웃
   - 다른 디바이스는 인증 상태 유지
   - 특정 리프레시 토큰 무효화
   - 현재 세션 쿠키 삭제

2. **모든 디바이스 로그아웃**: 사용자가 모든 디바이스에서 로그아웃
   - 사용자의 모든 리프레시 토큰 무효화
   - 모든 디바이스에서 재인증 강제
   - 침해된 계정에 대한 보안 중심 접근 방식

### 🔐 보안 기능
- **토큰 무효화**: 서버 저장소에서 토큰 제거
- **쿠키 삭제**: 클라이언트 측 인증 쿠키 제거
- **조용한 실패**: 토큰 유효성 정보를 노출하지 않음
- **감사 추적**: 보안 모니터링을 위한 로그아웃 이벤트 로깅
- **경쟁 상태 안전**: 동시 로그아웃 요청 처리

### 💡 구현 세부사항
- 요청 본문 또는 쿠키에서 리프레시 토큰 추출
- 토큰 구조에서 사용자 ID와 역할 파싱
- 토큰 존재 여부에 따라 적절한 서비스 메서드 호출
- 토큰 검증 결과에 관계없이 쿠키 삭제
- 잘못된 토큰에 대해서도 성공 상태 반환 (보안)

### 📝 요청 예시
\`\`\`json
// 단일 디바이스 로그아웃
{
  "refreshToken": "refresh_123_P_abc123def456"
}

// 모든 디바이스 로그아웃
{
  // 빈 본문 또는 refreshToken 생략
}
\`\`\`

### ✅ 성공 응답
- **상태**: 200 OK
- **본문**: 비어있음 (void 응답)
- **쿠키**: 자동으로 삭제됨
- **작업**: 세션(들)이 성공적으로 종료됨

### 🔄 로그아웃 후 동작
- 사용자는 보호된 리소스에 접근하기 위해 다시 인증해야 함
- 클라이언트 애플리케이션은 로그인 화면으로 리다이렉트해야 함
- 캐시된 사용자 데이터를 클라이언트 저장소에서 삭제해야 함
- 보호된 엔드포인트에 대한 API 요청은 401 Unauthorized를 반환함

### ⚠️ 오류 처리
- **우아한 실패**: 로그아웃 시도에 대해 절대 오류를 반환하지 않음
- **쿠키 삭제**: 토큰 유효성에 관계없이 항상 쿠키 삭제
- **조용한 작업**: 토큰 상태에 대한 정보를 노출하지 않음
- **보안 우선**: 상세한 오류 보고보다 보안을 우선시
      `,
    }),
    ApiBody({
      type: LogoutDto,
      description: '특정 디바이스 로그아웃을 위한 선택적 리프레시 토큰',
    }),
    ApiOkResponseTemplate({
      description: '✅ 사용자가 성공적으로 로그아웃됨',
    }),
    ApiStatuses(StatusCodes.OK),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Current User Information
//? ---------------------------------------------------------------------- ?//

export const GetMeDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👤 현재 사용자 정보 조회',
      description: `
### 📝 기능 설명
현재 인증된 사용자의 프로필 정보 조회. 인증 컨텍스트를 기반으로 로그인한 사용자의 세부 정보, 역할 및 관련 데이터에 접근할 수 있습니다.

### 🔄 비즈니스 로직
- JWT 토큰 클레임에서 사용자 정보 추출
- 사용자 인증 상태 검증
- 역할별 정보가 포함된 사용자 프로필 데이터 반환
- 사용자 역할에 따라 관련 엔티티(학교, 학생 등) 포함
- 요청된 역할에 대한 적절한 권한 보장

### 🔐 인증 요구사항
- 유효한 JWT 액세스 토큰 필요
- 사용자가 인증되고 활성 상태여야 함
- 역할 기반 접근 제어 적용
- 토큰이 만료되거나 취소되지 않아야 함

### 💡 사용 사례
- **프로필 표시**: 대시보드에서 사용자 정보 표시
- **역할 확인**: 사용자 권한 및 역할 확인
- **데이터 사전 로딩**: 사용자 컨텍스트로 애플리케이션 초기화
- **세션 검증**: 현재 인증 상태 확인
- **다중 역할 지원**: 다른 사용자 컨텍스트 간 전환

### 📱 통합 예시
- 대시보드 사용자 프로필 섹션
- 사용자 이름과 역할이 포함된 내비게이션 메뉴
- 설정 페이지 사용자 정보
- 권한 기반 UI 렌더링
- 학교/컨텍스트 전환 기능

### 📝 상세 응답 예시
\`\`\`json
{
  "id": 123,
  "username": "parent.user",
  "phone": "01012345678",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "instructor": {
    "id": 45,
    "name": "김선생",
    "phone": "01012345678",
    "sams": [
      {
        "id": 1,
        "schoolId": 10,
        "isActive": true,
        "school": {
          "id": 10,
          "name": "테스트초등학교",
          "schoolCode": "B123456789",
          "region": "서울특별시",
          "address": "서울시 강남구 테스트로 123"
        }
      }
    ]
  },
  "parent": {
    "id": 67,
    "name": "김학부모",
    "phone": "01012345678",
    "students": [
      {
        "id": 89,
        "name": "김학생",
        "schoolId": 10,
        "school": {
          "id": 10,
          "name": "테스트초등학교",
          "schoolCode": "B123456789",
          "region": "서울특별시",
          "address": "서울시 강남구 테스트로 123"
        }
      }
    ]
  }
}
\`\`\`

### 🎯 역할별 데이터
- **PARENT**: 학생 정보 및 관련 학교 포함
- **INSTRUCTOR**: 강의 배정 및 학교 소속 포함
- **MANAGER**: 관리하는 학교 및 관리자 권한 포함
- **ADMIN**: 시스템 전체 관리자 접근 포함

### ⚠️ 오류 조건
- **401 Unauthorized**: 잘못되었거나 만료된 인증 토큰
- **403 Forbidden**: 사용자 계정 비활성화 또는 권한 부족
- **404 Not Found**: 사용자 계정이 더 이상 존재하지 않음
      `,
    }),
    ApiOkResponseTemplate({
      description: '✅ 현재 사용자 정보가 성공적으로 조회됨',
      type: UserDto,
    }),
    ApiStatuses(
      StatusCodes.UNAUTHORIZED,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? School Switching
//? ---------------------------------------------------------------------- ?//

export const SwitchSchoolDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 컨텍스트 전환',
      description: `
### 📝 기능 설명
다중 테넌트 작업을 위한 현재 사용자의 학교 컨텍스트 전환. 동일한 인증 세션을 유지하면서 사용자가 활성 학교 컨텍스트를 변경할 수 있습니다.

### 🔄 비즈니스 로직
- 사용자 인증 및 권한 검증
- 사용자가 대상 학교에 접근할 수 있는지 확인
- 세션에서 사용자의 활성 학교 컨텍스트 업데이트
- 업데이트된 학교 컨텍스트로 새 액세스 토큰 생성
- 세션 연속성을 위해 리프레시 토큰 유지
- 역할별 학교 전환 지원

### 🎯 사용 사례
- **다중 학교 사용자**: 여러 학교에 접근할 수 있는 사용자
- **역할 전환**: 학교 내에서 다른 역할 간 전환
- **컨텍스트 탐색**: 다른 학교 대시보드 간 이동
- **관리자 접근**: 관리자가 관리하는 학교 간 전환

### 🔐 보안 기능
- 대상 학교에 대한 사용자 권한 검증
- 역할 기반 접근 제어 적용
- 보안을 위한 세션 토큰 재생성
- 학교 컨텍스트 변경에 대한 감사 로깅
- 무단 학교 접근 방지

### 💡 구현 세부사항
- JWT 토큰에서 사용자 정보 추출
- 학교 접근 권한 검증
- 새 학교 컨텍스트로 액세스 토큰 업데이트
- 구성에 따라 선택적으로 리프레시 토큰 업데이트
- 새 인증 토큰 반환

### 📝 요청 예시
\`\`\`json
{
  "role": "PARENT",
  "schoolId": 123
}
\`\`\`

### 📝 상세 응답 예시
\`\`\`json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6IlBBUkVOVCIsInNjaG9vbElkIjoxMjMsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ..."
}
\`\`\`

### 🎯 역할별 동작
- **PARENT**: 자녀가 등록된 학교로 전환 가능
- **INSTRUCTOR**: 강의 배정이 있는 학교로 전환 가능
- **MANAGER**: 관리하는 학교로 전환 가능
- **ADMIN**: 시스템의 모든 학교로 전환 가능

### ⚠️ 오류 조건
- **401 Unauthorized**: 사용자가 인증되지 않았거나 잘못된 세션
- **403 Forbidden**: 사용자가 대상 학교에 접근할 수 없음
- **404 Not Found**: 대상 학교가 존재하지 않거나 비활성 상태
- **400 Bad Request**: 잘못된 역할 또는 학교 ID 제공
      `,
    }),
    ApiBody({
      type: SwitchSchoolDto,
      description: '역할과 학교 ID가 포함된 학교 전환 요청',
    }),
    ApiOkResponseTemplate({
      description: '✅ 학교 컨텍스트가 성공적으로 전환됨',
      type: AuthTokenDto,
    }),
    ApiStatuses(
      StatusCodes.UNAUTHORIZED,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
    ),
  );
};
