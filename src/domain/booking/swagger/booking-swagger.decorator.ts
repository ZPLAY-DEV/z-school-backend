import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CancelBookingDto } from 'src/domain/booking/dto/cancel-booking.dto';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';
import { CreateManualBookingDto } from 'src/domain/booking/dto/create-manual-booking.dto';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';
import { Booking } from 'src/domain/booking/entities/booking.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Booking
//? ---------------------------------------------------------------------- ?//

export const CreateBookingSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ Course Registration',
      description: `
**📝 Feature Description**
- 실시간 수강신청 API로 즉시 피드백 제공
- 다양한 신청 규칙 지원 (선착순, 무작위, 누구나)
- 동시성 문제 해결을 위한 Redis 기반 실시간 처리

**🔄 Business Logic**
1. **FIRST (선착순)**: Redis 기반 실시간 처리
   - 즉시 수강 확정 또는 대기열 등록
   - 수용인원 초과 시 대기순번 자동 할당
   - 실시간 경쟁 상황 처리
2. **RANDOM (무작위)**: DB 기반 처리
   - 신청 기간 종료 후 결과 발표 예정
   - 모든 신청자를 PENDING 상태로 등록
3. **ANYONE (누구나)**: 즉시 확정 처리
   - 수용인원 제한 없이 즉시 ENROLLED 상태
   - 대기순번 없음

**⚠️ Important Constraints**
- termId, offeringId, studentId는 필수 파라미터
- 동일 학생의 중복 신청 불가
- 수용인원 제한 확인 (capacity > 0일 때)
- 신청 기간 내에서만 가능

**📚 Response Messages**
- **ENROLLED**: "🟢 수강신청결과 {과목명} 수강이 확정되었습니다."
- **PENDING**: "🟡 수강신청결과 {과목명} 수강이 대기상태입니다. (대기 {순번}번)"
- **FULL**: "🔴 수강신청결과 {과목명} 수강이 불가합니다."
- **RANDOM**: "🔵 {과목명} 수강신청 했습니다. (신청기간이후 결과발표예정)"

**📚 Example Scenarios**
- 실시간 선착순 수강신청
- 인기 과목의 무작위 추첨 신청
- 무제한 수용인원 과목의 즉시 신청
- 초과 신청 시 대기열 관리
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
      examples: {
        'First-come-first-served': {
          value: {
            termId: 1,
            offeringId: 1,
            studentId: 1,
            capacity: 20,
            pickRule: 'FIRST',
            lessonName: '바이올린',
          },
        },
        'Random/Lottery': {
          value: {
            termId: 1,
            offeringId: 10,
            studentId: 11,
            capacity: 20,
            pickRule: 'RANDOM',
            lessonName: '마인크래프트',
          },
        },
        Anyone: {
          value: {
            termId: 1,
            offeringId: 30,
            studentId: 31,
            capacity: 0,
            pickRule: 'ANYONE',
            lessonName: '창의교실 A',
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

export const CreateManualBookingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏰ 기간외 수강신청 (관리자 수동 등록)',
      description: `
**📝 기능 설명**
- 수강신청 기간이 종료된 후 관리자가 수동으로 수강신청을 처리하는 API
- 특별한 상황에서 기간외 수강신청을 허용해야 할 때 사용
- 수용인원 제한 없이 강제 등록 가능
- 여러 학생을 한 번에 등록 가능

**🔄 비즈니스 로직**
1. 수강신청 기간 제한을 우회하여 등록 처리
2. 수용인원 제한과 관계없이 등록 진행
3. 관리자 권한으로 강제 등록 실행
4. 기간외 수강신청 사유를 기록 (note: "기간외 수강신청")
5. 즉시 PENDING 상태로 수강신청 생성
6. 대기순번을 기존 신청자 다음 순서로 순차적으로 자동 할당
7. 중복 예약 체크 후 등록 진행

**⚠️ 중요 제약사항**
- 관리자 권한이 필요함
- 이미 수강신청한 학생은 중복 등록 불가 (자동 검증)
- 삭제된 과목이나 학생은 등록 불가
- 특별한 상황에서만 사용해야 함
- groupId와 studentIds는 필수 파라미터

**📚 사용 예시**
- 수강신청 기간을 놓친 학생들을 위한 특별 처리
- 전학생 등 특별한 경우의 수강신청
- 시스템 오류로 인한 수강신청 실패 보상
- 관리자 판단 하에 필요한 기간외 등록
- 여러 학생을 동시에 등록해야 하는 경우

**🔍 응답 데이터**
- 수강신청 배열 (여러 학생의 예약 정보)
- 각 예약별: 수강신청 ID, 과목 ID, 학생 ID
- 수강신청 과목명, 대기순번, 상태
- 기간외 수강신청 비고 메모
- 생성/수정 일시
      `,
    }),
    ApiBody({
      type: CreateManualBookingDto,
      examples: {
        '기간외 수강신청 예시': {
          value: {
            groupId: 15,
            studentIds: [123, 124, 125],
          },
        },
        '전학생 특별 등록': {
          value: {
            groupId: 8,
            studentIds: [456, 457],
          },
        },
        '단일 학생 등록': {
          value: {
            groupId: 12,
            studentIds: [789],
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '기간외 수강신청 성공',
      type: Array<Booking>,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.UNPROCESSABLE_ENTITY,
      StatusCodes.INTERNAL_SERVER_ERROR,
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
- 기존 수강신청을 취소하고 대기 중인 학생들에게 자동으로 자리를 할당
- 실시간 수강신청 취소 API로 즉시 피드백 제공
- 취소 시 대기열을 자동으로 관리하여 다음 학생에게 기회 제공

**🔄 비즈니스 로직**
1. **FIRST (선착순)**: Redis 기반 실시간 처리
   - 즉시 수강신청 취소 처리
   - 대기열에서 다음 학생을 자동으로 수강 확정
   - 실시간 대기열 순번 업데이트
2. **RANDOM/ANYONE**: DB 기반 처리
   - 수강신청 상태를 취소로 변경
   - 대기 중인 학생이 있다면 자동으로 승격
3. 취소된 수강신청 데이터 업데이트 (소프트 삭제 또는 상태 변경)
4. 대기 중인 학생들에게 자동으로 자리 할당
5. 영향받은 레코드 수 반환

**⚠️ 중요 제약사항**
- 유효한 수강신청만 취소 가능
- 이미 취소된 수강신청은 재취소 불가
- 취소 기간 제한이 있을 수 있음
- 대기 중인 학생이 승격될 때 자동 알림 발송
- offeringId, studentId, pickRule, lessonName은 필수 파라미터

**📚 사용 예시**
- 학생이 자발적으로 수강신청 취소
- 관리자가 강제로 수강신청 취소
- 시스템 오류 수정을 위한 취소
- 대기 중인 학생에게 자리 양보
- 개인 사정으로 인한 수강 포기

**📚 응답 데이터**
- 취소 처리된 레코드 수 (Number)
- 성공 시: 1 (정상 취소)
- 실패 시: 0 (취소할 수강신청 없음)
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
      required: true,
      examples: {
        '선착순 수강신청 취소': {
          value: {
            offeringId: 1,
            studentId: 1,
            pickRule: 'FIRST',
            lessonName: '바이올린',
          },
        },
        '무작위 수강신청 취소': {
          value: {
            offeringId: 10,
            studentId: 11,
            pickRule: 'RANDOM',
            lessonName: '마인크래프트',
          },
        },
        '누구나 수강신청 취소': {
          value: {
            offeringId: 30,
            studentId: 31,
            pickRule: 'ANYONE',
            lessonName: '창의교실 A',
          },
        },
      },
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
