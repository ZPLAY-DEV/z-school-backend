import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { GenerateS3UrlsDto } from '../dto/generate-s3-urls.dto';
import { ResendNewsletterDto } from '../dto/resend-newsletter.dto';
import { NewsletterDetailResponseDto } from '../dto/response-extended-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { Newsletter } from '../entities/newsletter.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Newsletter
//? ---------------------------------------------------------------------- ?//

export const CreateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📧 뉴스레터 생성',
      description: `
**📝 기능 설명**
- 학교의 특정 학기에 귀속된 뉴스레터를 생성합니다
- 다양한 발송 대상과 스케줄링을 지원합니다
- 3가지 타입의 뉴스레터 작성 가능

**🔄 비즈니스 로직**
1. 뉴스레터 타입별 제한 확인 (REGISTRATION은 학기당 1회)
2. 발송 대상 유효성 검증 및 targetItems 배열 처리
3. scheduledAt이 null이면 즉시 발송 대기 상태로 설정
4. 예약 시간 지정 시 최대 5분 지연으로 스케줄링 처리
5. S3 이미지 URL 배열로 첨부파일 저장

**⚠️ 중요 제약사항**
- REGISTRATION 타입은 학기당 1개만 생성 가능
- targetItems는 target 타입에 맞는 ID 배열이어야 함
- scheduledAt은 현재 시간 이후여야 함
- 제목은 최대 32자, 본문은 TEXT 타입으로 제한 없음

**📚 예시 시나리오**
- 전교생 대상 수강신청 안내 (REGISTRATION)
- 특정 학년 현장학습 공지 (NEWS)
- 강좌별 만족도 조사 (SURVEY)
      `,
    }),
    ApiBody({
      type: CreateNewsletterDto,
      examples: {
        'registration-newsletter': {
          summary: '수강신청 안내 뉴스레터',
          description: '전교생 대상 수강신청 안내 (즉시 발송)',
          value: {
            schoolId: 1,
            termId: 1,
            title: '2025년 1학기 수강신청 안내',
            body: '2025년 1학기 늘봄학교 수강신청을 시작합니다.\n\n신청 기간: 2025년 2월 1일 ~ 2월 15일\n신청 방법: 앱을 통한 온라인 신청\n\n자세한 내용은 첨부된 안내문을 확인해주세요.',
            type: 'REGISTRATION',
            target: 'SCHOOL',
            targetItems: null,
            targetLabel: '전교생',
            images: ['https://s3.amazonaws.com/bucket/registration-guide.jpg'],
            scheduledAt: null,
          },
        },
        'grade-specific-news': {
          summary: '특정 학년 공지사항',
          description: '1, 2학년 대상 공지사항 (예약 발송)',
          value: {
            schoolId: 1,
            termId: 1,
            title: '1, 2학년 현장학습 안내',
            body: '다음 주 금요일에 진행될 현장학습에 대한 안내입니다.\n\n일시: 2025년 3월 15일 금요일\n장소: 국립중앙박물관\n집합시간: 오전 9시\n\n준비물과 주의사항을 확인해주세요.',
            type: 'NEWS',
            target: 'GRADE',
            targetItems: [1, 2],
            targetLabel: '1, 2학년',
            images: [],
            scheduledAt: '2025-03-10T09:00:00Z',
          },
        },
        'lesson-survey': {
          summary: '강좌별 만족도 조사',
          description: '특정 강좌 수강생 대상 설문조사',
          value: {
            schoolId: 1,
            termId: 1,
            title: '미술반 수업 만족도 조사',
            body: '미술반 수업에 대한 만족도 조사를 실시합니다.\n\n설문 기간: 2025년 4월 1일 ~ 4월 7일\n소요 시간: 약 5분\n\n학생들의 의견을 바탕으로 더 나은 수업을 준비하겠습니다.',
            type: 'SURVEY',
            target: 'LESSON',
            targetItems: [10, 11],
            targetLabel: '미술반 A, B조',
            images: [],
            scheduledAt: '2025-04-01T10:00:00Z',
          },
        },
        'individual-notice': {
          summary: '개별 학생 안내',
          description: '특정 학생들에게만 발송되는 개별 안내',
          value: {
            schoolId: 1,
            termId: 1,
            title: '특별활동 참가 안내',
            body: '귀하의 자녀가 특별활동에 선발되었습니다.\n\n활동명: 과학 탐구 프로젝트\n기간: 2025년 5월 1일 ~ 5월 31일\n\n참가 의사를 확인해주세요.',
            type: 'NEWS',
            target: 'STUDENT',
            targetItems: [123, 124, 125],
            targetLabel: '특별활동 선발 학생',
            images: [],
            scheduledAt: null,
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '뉴스레터 생성 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Newsletters
//? ---------------------------------------------------------------------- ?//

export const FindNewslettersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📋 뉴스레터 목록 조회',
      description: `
**📝 기능 설명**
- 특정 학교와 학기의 뉴스레터 목록을 조회합니다
- 선택적으로 뉴스레터 타입별 필터링이 가능합니다
- ID 내림차순으로 정렬하여 최신 순으로 반환

**🔄 비즈니스 로직**
1. schoolId와 termId로 기본 조건 필터링
2. type 파라미터가 있으면 해당 타입만 필터링
3. 삭제되지 않은 뉴스레터만 조회 (deletedAt IS NULL)
4. ID 내림차순 정렬로 최신 뉴스레터가 상단에 표시
5. 발송 상태와 스케줄 정보 포함하여 반환

**⚠️ 중요 제약사항**
- schoolId와 termId는 필수 파라미터
- type은 유효한 enum 값이어야 함 (REGISTRATION, NEWS, SURVEY)
- 존재하지 않는 학교/학기 ID는 빈 배열 반환

**📚 예시 시나리오**
- 관리자 대시보드에서 뉴스레터 관리
- 학교별/학기별 발송 이력 조회
- 수강신청 뉴스레터만 필터링하여 확인
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      description: '학교 ID (필수)',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (필수)',
      example: 1,
    }),
    ApiQuery({
      name: 'type',
      enum: ['REGISTRATION', 'NEWS', 'SURVEY'],
      description: '뉴스레터 타입 필터 (선택사항)',
      required: false,
      example: 'REGISTRATION',
    }),
    ApiOkResponse({
      description: '뉴스레터 목록 조회 완료',
      type: Newsletter,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Newsletters To Be Sent
//? ---------------------------------------------------------------------- ?//

export const FindNewslettersToBeSentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏰ 발송 대기 뉴스레터 조회',
      description: `
**📝 기능 설명**
- 발송 예정인 뉴스레터 목록을 조회합니다
- 스케줄링된 뉴스레터와 즉시 발송 대기 중인 뉴스레터를 포함합니다
- 발송 시스템에서 처리할 뉴스레터 큐 관리용 엔드포인트입니다

**🔄 비즈니스 로직**
1. 발송 상태가 SCHEDULED인 뉴스레터 조회
2. scheduledAt이 현재 시간 이전인 뉴스레터 필터링
3. 삭제되지 않은 뉴스레터만 포함
4. 발송 시간 순으로 정렬하여 반환
5. 실제 발송 처리를 위한 데이터 제공

**⚠️ 중요 제약사항**
- 시스템 내부 발송 프로세스용 엔드포인트
- 관리자 권한 필요 (현재는 인증 체크 없음)
- 대량 처리를 위한 최적화된 쿼리 사용

**📚 예시 시나리오**
- 발송 스케줄러에서 처리할 뉴스레터 조회
- 발송 대기열 모니터링
- 지연된 발송 건 확인
      `,
    }),
    ApiOkResponse({
      description: '발송 대기 뉴스레터 목록 조회 완료',
      type: Newsletter,
      isArray: true,
    }),
    ApiStatuses(),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Registration Newsletter
//? ---------------------------------------------------------------------- ?//

export const FindRegistrationNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 수강신청 뉴스레터 조회',
      description: `
**📝 기능 설명**
- 특정 학교와 학기의 수강신청 타입 뉴스레터를 조회합니다
- 수강신청 뉴스레터는 학기당 1개만 존재할 수 있습니다
- 수강신청 관련 정보를 앱에서 표시할 때 사용

**🔄 비즈니스 로직**
1. schoolId와 termId로 해당 학기 확인
2. REGISTRATION 타입의 뉴스레터만 조회
3. 삭제되지 않은 뉴스레터 중에서 검색
4. 단일 결과 반환 (학기당 1개 제한)

**⚠️ 중요 제약사항**
- 수강신청 뉴스레터가 없으면 404 에러 반환
- REGISTRATION 타입만 조회 가능
- 발송 여부와 관계없이 조회 가능

**📚 예시 시나리오**
- 앱에서 수강신청 페이지 접근 시 안내문 표시
- 수강신청 기간 정보 확인
- 수강신청 관련 공지사항 조회
      `,
    }),
    ApiQuery({
      name: 'schoolId',
      type: Number,
      description: '학교 ID (필수)',
      example: 1,
    }),
    ApiQuery({
      name: 'termId',
      type: Number,
      description: '학기 ID (필수)',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '수강신청 뉴스레터 조회 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Newsletter By ID
//? ---------------------------------------------------------------------- ?//

export const FindNewsletterByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔍 뉴스레터 상세 조회',
      description: `
**📝 기능 설명**
- 특정 ID로 뉴스레터의 상세 정보를 조회합니다
- 뉴스레터 기본 정보와 함께 관련 학생 정보도 포함됩니다
- 읽음 상태 추적 정보를 함께 제공합니다

**🔄 비즈니스 로직**
1. ID로 뉴스레터 기본 정보 조회
2. 발송 대상에 따른 학생 목록 조회
3. 각 학생별 읽음 상태 확인
4. 총 대상자 수와 읽음률 계산
5. 첨부 이미지와 스케줄 정보 포함

**⚠️ 중요 제약사항**
- 존재하지 않는 ID는 404 에러 반환
- 삭제된 뉴스레터는 조회 불가
- 읽음 상태는 수강신청 타입에서만 제공

**📚 예시 시나리오**
- 뉴스레터 상세 페이지 표시
- 발송 상태 및 읽음 통계 확인
- 뉴스레터 수정을 위한 현재 정보 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '조회할 뉴스레터의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 상세 조회 완료',
      type: NewsletterDetailResponseDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Newsletter
//? ---------------------------------------------------------------------- ?//

export const UpdateNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✏️ 뉴스레터 수정',
      description: `
**📝 기능 설명**
- 기존 뉴스레터의 정보를 부분적으로 수정합니다
- 모든 필드는 선택사항이며 제공된 필드만 업데이트됩니다
- 발송 전후 모든 상태에서 수정 가능합니다

**🔄 비즈니스 로직**
1. ID로 수정 대상 뉴스레터 확인
2. 제공된 필드만 선택적으로 업데이트
3. scheduledAt 변경 시 발송 예약 상태 재설정
4. rescheduledAt 설정 시 재발송 예약 처리
5. 수정된 뉴스레터 정보 반환

**⚠️ 중요 제약사항**
- type, schoolId, termId는 수정 불가
- 제목은 최대 32자까지 가능
- targetItems는 target 타입에 맞는 ID 배열이어야 함
- 이미 발송된 뉴스레터도 재발송 예약 가능

**📚 예시 시나리오**
- 잘못된 내용 수정
- 발송 대상 변경
- 발송 예약 시간 조정
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '수정할 뉴스레터의 ID',
      example: 1,
    }),
    ApiBody({
      type: UpdateNewsletterDto,
      examples: {
        'content-update': {
          summary: '내용 수정',
          description: '제목과 본문만 수정',
          value: {
            title: '수정된 공지사항 제목',
            body: '수정된 내용입니다.\n\n추가 정보가 포함되었습니다.',
          },
        },
        'target-change': {
          summary: '발송 대상 변경',
          description: '전교생에서 특정 학년으로 대상 변경',
          value: {
            target: 'GRADE',
            targetItems: [3, 4],
            targetLabel: '3, 4학년',
          },
        },
        'schedule-setting': {
          summary: '발송 예약 설정',
          description: '즉시 발송에서 예약 발송으로 변경',
          value: {
            scheduledAt: '2025-02-15T09:00:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 수정 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Cancel Newsletter
//? ---------------------------------------------------------------------- ?//

export const CancelNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '❌ 뉴스레터 발송 취소',
      description: `
**📝 기능 설명**
- 예약된 뉴스레터의 발송을 취소합니다
- 발송 상태를 CANCELLED로 변경합니다
- 발송 큐에서 제거하여 실제 발송을 중단합니다

**🔄 비즈니스 로직**
1. 뉴스레터 ID로 대상 확인
2. 발송 상태가 SCHEDULED인지 검증
3. 상태를 CANCELLED로 변경
4. 발송 스케줄러에서 제거
5. 취소된 뉴스레터 정보 반환

**⚠️ 중요 제약사항**
- SCHEDULED 상태의 뉴스레터만 취소 가능
- 이미 발송된 뉴스레터는 취소 불가
- 취소 후 재예약을 통해 다시 발송 가능

**📚 예시 시나리오**
- 잘못 예약된 뉴스레터 취소
- 내용 수정이 필요한 경우 임시 취소
- 발송 시점 조정이 필요한 경우
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '취소할 뉴스레터의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 발송 취소 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Resend Newsletter
//? ---------------------------------------------------------------------- ?//

export const ResendNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 뉴스레터 재발송',
      description: `
**📝 기능 설명**
- 이미 발송된 뉴스레터를 지정된 시간에 재발송합니다
- 새로운 발송 스케줄을 설정합니다
- 동일한 대상자들에게 동일한 내용으로 재발송됩니다

**🔄 비즈니스 로직**
1. ID로 재발송할 뉴스레터 확인
2. rescheduledAt 필드에 새로운 발송 시간 설정
3. 발송 상태를 재발송 대기로 변경
4. 기존 발송 기록은 유지
5. 동일한 발송 대상 및 내용으로 처리

**⚠️ 중요 제약사항**
- 이미 발송된 뉴스레터만 재발송 가능
- scheduledAt은 현재 시간 이후여야 함
- 타임존 정보가 없으면 UTC로 처리

**📚 예시 시나리오**
- 중요 공지사항의 리마인더 발송
- 읽지 않은 학부모들을 위한 재발송
- 시스템 오류로 누락된 발송 보완
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '재발송할 뉴스레터의 ID',
      example: 1,
    }),
    ApiBody({
      type: ResendNewsletterDto,
      examples: {
        'immediate-resend': {
          summary: '즉시 재발송',
          description: '현재 시점에서 즉시 재발송',
          value: {
            scheduledAt: '2025-01-20T10:00:00Z',
          },
        },
        'scheduled-resend': {
          summary: '예약 재발송',
          description: '다음 주에 재발송 예약',
          value: {
            scheduledAt: '2025-01-27T09:00:00Z',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 재발송 예약 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Mark As Read
//? ---------------------------------------------------------------------- ?//

export const MarkAsReadDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 뉴스레터 읽음 표시',
      description: `
**📝 기능 설명**
- 특정 학부모가 특정 뉴스레터를 읽었음을 표시합니다
- 읽음 통계와 추적을 위한 엔드포인트입니다
- 뉴스레터별 읽음률 분석에 활용됩니다

**🔄 비즈니스 로직**
1. parentId와 newsletterId 조합으로 읽음 상태 기록
2. 중복 호출 시에도 안전하게 처리
3. 읽음 시간을 자동으로 기록
4. 뉴스레터별 읽음률 통계 생성
5. 미읽음 학부모 식별 가능

**⚠️ 중요 제약사항**
- 유효한 newsletter ID와 parent ID 필요
- 이미 읽음 처리된 경우에도 안전하게 처리
- 삭제된 뉴스레터나 학부모는 처리 불가

**📚 예시 시나리오**
- 학부모 앱에서 뉴스레터 열람 시 자동 호출
- 웹페이지에서 뉴스레터 조회 시 추적
- 발송 효과 분석 데이터 수집
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '읽음 표시할 뉴스레터의 ID',
      example: 1,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '읽음 표시할 학부모의 ID',
      example: 5,
    }),
    ApiOkResponse({
      description: '읽음 표시 완료 (응답 본문 없음)',
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Newsletter
//? ---------------------------------------------------------------------- ?//

export const DeleteNewsletterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🗑️ 뉴스레터 삭제',
      description: `
**📝 기능 설명**
- 뉴스레터를 소프트 삭제합니다
- 삭제된 뉴스레터는 목록에서 제외되지만 데이터는 보존됩니다
- 예약된 발송이 있다면 자동으로 취소됩니다

**🔄 비즈니스 로직**
1. ID로 삭제 대상 뉴스레터 확인
2. deletedAt 필드에 삭제 시간 기록
3. 예약된 발송이 있으면 자동 취소
4. 관련 shortlink와 읽음 기록은 유지
5. 삭제된 뉴스레터 정보 반환

**⚠️ 중요 제약사항**
- 발송 상태와 관계없이 삭제 가능
- 이미 발송된 메시지는 취소되지 않음
- 소프트 삭제로 데이터 복구 가능

**📚 예시 시나리오**
- 잘못 생성된 뉴스레터 제거
- 테스트용 뉴스레터 정리
- 부적절한 내용의 뉴스레터 삭제
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '삭제할 뉴스레터의 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '뉴스레터 삭제 완료',
      type: Newsletter,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Generate S3 URLs
//? ---------------------------------------------------------------------- ?//

export const GenerateNewsletterS3UrlsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📎 뉴스레터 첨부파일 업로드 URL 생성',
      description: `
**📝 기능 설명**
- 뉴스레터에 첨부할 이미지 파일의 S3 업로드 URL을 생성합니다
- Pre-signed URL 방식으로 안전한 파일 업로드를 지원합니다
- 학교와 학기별로 파일이 체계적으로 관리됩니다

**🔄 비즈니스 로직**
1. schoolId와 termId로 업로드 경로 구성
2. mimeType 검증 및 파일 확장자 추출
3. 고유한 파일명 생성 (타임스탬프 + UUID)
4. S3 Pre-signed URL 생성
5. 업로드용 URL과 다운로드용 URL 반환

**⚠️ 중요 제약사항**
- 이미지 파일만 업로드 가능 (JPEG, PNG, GIF, WebP)
- 파일 크기 제한과 보안 정책 적용
- Pre-signed URL은 제한 시간 내에만 사용 가능

**📚 예시 시나리오**
- 뉴스레터 작성 시 이미지 첨부
- 공지사항에 안내문 이미지 추가
- 설문조사에 참고 이미지 첨부
      `,
    }),
    ApiBody({
      type: GenerateS3UrlsDto,
      examples: {
        'jpeg-image': {
          summary: 'JPEG 이미지 업로드',
          description: 'JPEG 형식의 이미지 파일 업로드 URL 생성',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/jpeg',
          },
        },
        'png-image': {
          summary: 'PNG 이미지 업로드',
          description: 'PNG 형식의 이미지 파일 업로드 URL 생성',
          value: {
            schoolId: 1,
            termId: 1,
            mimeType: 'image/png',
          },
        },
        'webp-image': {
          summary: 'WebP 이미지 업로드',
          description: '고효율 WebP 형식의 이미지 파일 업로드',
          value: {
            schoolId: 2,
            termId: 3,
            mimeType: 'image/webp',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'S3 업로드 URL 생성 완료',
      schema: {
        type: 'object',
        properties: {
          uploadUrl: {
            type: 'string',
            description: '파일 업로드용 Pre-signed URL',
            example:
              'https://s3.amazonaws.com/bucket/schools/1/terms/1/newsletters/file.jpg?signature=...',
          },
          downloadUrl: {
            type: 'string',
            description: '업로드 완료 후 접근 가능한 다운로드 URL',
            example:
              'https://s3.amazonaws.com/bucket/schools/1/terms/1/newsletters/file.jpg',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
