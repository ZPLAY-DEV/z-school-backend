import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CancelBookingDto } from 'src/domain/booking/dto/cancel-booking.dto';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';
import { CreateLateBookingDto } from 'src/domain/booking/dto/create-late-booking.dto';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Booking
//? ---------------------------------------------------------------------- ?//

export const CreateBookingSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 수강신청',
      description: `
**📝 기능 설명**
- 실시간 피드백을 제공하는 수강신청 API입니다
- 다양한 수강신청 규칙을 지원합니다 (선착순, 재수강우선, 무작위, 누구나)
- Redis 기반 실시간 처리로 동시성 문제를 해결합니다

**🔄 비즈니스 로직**
1. pickRule이 '선착순'인 경우 Redis 기반 처리
2. 기타 규칙의 경우 DB 기반 처리
3. 수강신청 결과 실시간 반환
4. 정원 초과 시 대기열 처리
5. 중복 신청 방지 로직 적용

**⚠️ 중요 제약사항**
- offeringId와 studentId는 필수 파라미터
- 동일 학생의 중복 신청 불가
- 정원 제한 체크 (capacity > 0인 경우)
- 수강신청 기간 내에서만 신청 가능

**📚 예시 시나리오**
- 선착순 수업 실시간 수강신청
- 재수강 우선권이 있는 수업 신청
- 무작위 추첨 방식 수업 신청
- 정원 제한 없는 수업 신청
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
      examples: {
        선착순: {
          value: {
            offeringId: 1,
            studentId: 1,
            capacity: 20,
            pickRule: '선착순',
            lessonName: '바이올린',
          },
        },
        재수강우선: {
          value: {
            offeringId: 10,
            studentId: 11,
            capacity: 20,
            pickRule: '재수강우선',
            lessonName: '마인드크래프트',
          },
        },
        무작위: {
          value: {
            offeringId: 20,
            studentId: 21,
            capacity: 30,
            pickRule: '무작위',
            lessonName: '원어민영어회화',
          },
        },
        누구나: {
          value: {
            offeringId: 30,
            studentId: 31,
            capacity: 0,
            pickRule: '누구나',
            lessonName: '창의교실A',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청 성공',
      type: ResponseBookingDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Late Booking
//? ---------------------------------------------------------------------- ?//

export const CreateLateBookingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏰ 기간 만료 후 수강신청',
      description: `
**📝 기능 설명**
- 수강신청 기간이 지난 후 관리자가 수동으로 수강신청을 처리합니다
- 특별한 사유로 늦은 수강신청을 허용할 때 사용합니다
- 정원 체크 없이 강제 등록이 가능합니다

**🔄 비즈니스 로직**
1. 수강신청 기간 제한 무시
2. 정원 초과 상관없이 등록 처리
3. 관리자 권한으로 강제 수강신청
4. 늦은 신청 사유 기록
5. 즉시 승인 상태로 생성

**⚠️ 중요 제약사항**
- 관리자 권한 필요
- 이미 등록된 학생은 중복 등록 불가
- 삭제된 수업이나 학생은 등록 불가
- 특별한 사유가 있는 경우에만 사용

**📚 예시 시나리오**
- 수강신청 기간 놓친 학생 구제
- 전학생 등 특별 케이스 처리
- 시스템 오류로 인한 수강신청 실패 보상
      `,
    }),
    ApiBody({
      type: CreateLateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: '기간 만료 후 수강신청 성공',
      type: ResponseBookingDto,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
    ),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Cancel Booking
//? ---------------------------------------------------------------------- ?//

export const CancelBookingSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '❌ 수강신청 취소',
      description: `
**📝 기능 설명**
- 기존 수강신청을 취소하고 대기자에게 자동 배정합니다
- 실시간 피드백을 제공하는 수강신청 취소 API입니다
- 취소와 동시에 대기열 관리를 수행합니다

**🔄 비즈니스 로직**
1. pickRule이 '선착순'인 경우 Redis 기반 처리
2. 기타 규칙의 경우 DB 기반 처리
3. 기존 수강신청 데이터 삭제 또는 상태 변경
4. 대기자가 있는 경우 자동 배정
5. 업데이트된 레코드 수 반환

**⚠️ 중요 제약사항**
- 유효한 수강신청 데이터만 취소 가능
- 이미 취소된 신청은 중복 취소 불가
- 수강신청 취소 기간 제한 확인
- 대기자 자동 배정 시 알림 발송

**📚 예시 시나리오**
- 학생이 직접 수강신청 취소
- 관리자의 수강신청 강제 취소
- 시스템 오류 수정을 위한 취소
- 대기자에게 자리 양보
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '수강신청 취소 성공',
      type: Number,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};
