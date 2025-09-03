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
- Real-time course registration API with instant feedback
- Supports multiple registration rules (First-come-first-served, Random, Anyone)
- Redis-based real-time processing to handle concurrency issues

**🔄 Business Logic**
1. For 'FIRST' (first-come-first-served): Redis-based processing with real-time enrollment
2. For 'RANDOM' (lottery): DB-based processing, results announced after registration period
3. For 'ANYONE' (open enrollment): Immediate enrollment with no capacity limits
4. Handles waiting queue when capacity is exceeded
5. Prevents duplicate registrations

**⚠️ Important Constraints**
- offeringId and studentId are required parameters
- No duplicate registrations for the same student
- Capacity limit check (when capacity > 0)
- Only available during registration period

**📚 Example Scenarios**
- Real-time first-come-first-served class registration
- Lottery-based enrollment for popular classes
- Open enrollment for unlimited capacity classes
- Waiting queue management for oversubscribed courses
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
      examples: {
        'First-come-first-served': {
          value: {
            offeringId: 1,
            studentId: 1,
            capacity: 20,
            pickRule: 'FIRST',
            lessonName: 'Violin',
          },
        },
        'Random/Lottery': {
          value: {
            offeringId: 10,
            studentId: 11,
            capacity: 20,
            pickRule: 'RANDOM',
            lessonName: 'Minecraft',
          },
        },
        Anyone: {
          value: {
            offeringId: 30,
            studentId: 31,
            capacity: 0,
            pickRule: 'ANYONE',
            lessonName: 'Creative Classroom A',
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
      summary: '❌ Cancel Course Registration',
      description: `
**📝 Feature Description**
- Cancels existing course registration and automatically assigns to waiting students
- Real-time course registration cancellation API with instant feedback
- Manages waiting queue automatically upon cancellation

**🔄 Business Logic**
1. For 'FIRST' (first-come-first-served): Redis-based processing with real-time queue management
2. For other rules ('RANDOM', 'ANYONE'): DB-based processing
3. Updates existing registration data (soft delete or status change)
4. Automatically assigns available spots to waiting students
5. Returns the number of affected records

**⚠️ Important Constraints**
- Only valid registrations can be cancelled
- Already cancelled registrations cannot be cancelled again
- Cancellation period restrictions may apply
- Automatic notification sent when waitlisted students are promoted

**📚 Example Scenarios**
- Student voluntarily cancels their registration
- Administrator forcibly cancels a registration
- System error correction through cancellation
- Giving up a spot to waitlisted students
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
      required: true,
    }),
    ApiOkResponseTemplate({
      description: 'Course registration cancelled successfully',
      type: Number,
    }),
    ApiStatuses(
      StatusCodes.BAD_REQUEST,
      StatusCodes.NOT_FOUND,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};
