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

export const CreateLateBookingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '⏰ Late Course Registration',
      description: `
**📝 Feature Description**
- Allows administrators to manually process course registrations after the registration period has ended
- Used for special cases where late registration needs to be permitted
- Enables forced registration without capacity checks

**🔄 Business Logic**
1. Bypasses registration period restrictions
2. Processes registration regardless of capacity limits
3. Administrative override for forced registration
4. Records reason for late registration
5. Creates registration in pending status immediately

**⚠️ Important Constraints**
- Requires administrator privileges
- Cannot register students who are already enrolled
- Cannot register for deleted courses or students
- Should only be used for special circumstances

**📚 Example Scenarios**
- Helping students who missed the registration period
- Processing special cases like transfer students
- Compensating for system errors that prevented successful registration
      `,
    }),
    ApiBody({
      type: CreateLateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: 'Late course registration successful',
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
