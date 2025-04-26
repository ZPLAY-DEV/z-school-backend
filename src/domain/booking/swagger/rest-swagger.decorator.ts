import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { BookingResponseDto } from 'src/domain/booking/dto/booking-response.dto';
import { CancelBookingDto } from 'src/domain/booking/dto/cancel-booking.dto';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';

export const CreateWithDbSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청 (low traffic)',
      description: ` 
      - 거의 경합적이지 않은 수강신청 트래픽이 발생하는 경우 사용
      - 아무런 인프라 도움없이 DB 퀴리를 통해 수강신청 생성
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: `
      - 수강신청 (low traffic)
      `,
      type: BookingResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.UNPROCESSABLE_ENTITY,
        errorFormatList: [HttpErrorConstants.ALREADY_BOOKED],
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};

export const CreateWithRedisSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '선착순 수강신청 (high traffic) with realtime feedback',
      description: ` 
      - 매우 경합적인 선착순 수강신청 트래픽이 발생하는 경우 사용
      - 레디스(redis)와 큐(sqs)를 통해 수강신청, end result 는 [POST] /v1/bookings/db 와 동일
      - 레디스로 atomic, race condition free 수강신청 처리
      - 큐(sqs)로 수강신청 트래픽 분산 처리
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: `
      - 수강신청 (high traffic)
      `,
      type: BookingResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.UNPROCESSABLE_ENTITY,
        errorFormatList: [HttpErrorConstants.ALREADY_BOOKED],
      },
      // {
      //   status: StatusCodes.UNPROCESSABLE_ENTITY,
      //   errorFormatList: [HttpErrorConstants.NOT_AVAILABLE],
      // },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};

export const CancelWithDbSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청취소 (low traffic)',
      description: ` 
      - 거의 경합적이지 않은 수강신청취소 트래픽이 발생하는 경우 사용
      - 아무런 인프라 도움없이 DB 퀴리를 통해 수강신청취소
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
    }),
    ApiOkResponseTemplate({
      description: `
      - 수강신청취소 (low traffic)
      `,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};

export const CancelWithRedisSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '선착순 수강신청취소 (high traffic)',
      description: ` 
      - 레디스(redis)를 통해 수강신청한 경우 수강신청취소 처리
      - 매우 경합적인 선착순 수강신청취소 트래픽이 발생하는 경우 사용
      - end result 는 [DEL] /v1/bookings/db 와 동일
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
    }),
    ApiOkResponseTemplate({
      description: `
      - 수강신청취소 (high traffic)
      `,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};
