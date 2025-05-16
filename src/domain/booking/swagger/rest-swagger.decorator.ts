import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CancelBookingDto } from 'src/domain/booking/dto/cancel-booking.dto';
import { CreateBookingDto } from 'src/domain/booking/dto/create-booking.dto';
import { ResponseBookingDto } from 'src/domain/booking/dto/response-booking.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Booking with DB (Low Traffic)
//? ---------------------------------------------------------------------- ?//

export const CreateWithDbSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청 (low traffic)',
      description: ` 
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
      - 거의 경합적이지 않은 수강신청 트래픽이 발생하는 경우 사용
      - 아무런 인프라 도움없이 DB 퀴리를 통해 수강신청 생성
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청 성공 (low traffic)',
      type: ResponseBookingDto,
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

//? ---------------------------------------------------------------------- ?//
//? Create Booking with Redis (High Traffic)
//? ---------------------------------------------------------------------- ?//

export const CreateWithRedisSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '선착순 수강신청 (high traffic) with realtime feedback',
      description: ` 
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
      - 매우 경합적인 선착순 수강신청 트래픽이 발생하는 경우 사용
      - 레디스(Redis)와 큐(SQS)를 통해 수강신청 처리
      - 레디스로 atomic, race condition free 수강신청 처리
      - 큐(SQS)로 수강신청 트래픽 분산 처리
      - End result는 [POST] /v1/bookings/db와 동일하지만 실시간 피드백 제공
      `,
    }),
    ApiBody({
      type: CreateBookingDto,
    }),
    ApiCreatedResponseTemplate({
      description: '선착순 수강신청 성공 (high traffic)',
      type: ResponseBookingDto,
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

//? ---------------------------------------------------------------------- ?//
//? Cancel Booking with DB (Low Traffic)
//? ---------------------------------------------------------------------- ?//

export const CancelWithDbSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청취소 (low traffic)',
      description: ` 
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
      - 거의 경합적이지 않은 수강신청취소 트래픽이 발생하는 경우 사용
      - 아무런 인프라 도움없이 DB 쿼리를 통해 수강신청 취소
      - Soft delete 방식으로 데이터 보존
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
    }),
    ApiOkResponseTemplate({
      description: '수강신청취소 성공 (low traffic)',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Cancel Booking with Redis (High Traffic)
//? ---------------------------------------------------------------------- ?//

export const CancelWithRedisSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '선착순 수강신청취소 (high traffic)',
      description: ` 
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
      - 레디스(Redis)를 통해 수강신청한 경우 수강신청취소 처리
      - 매우 경합적인 선착순 수강신청취소 트래픽이 발생하는 경우 사용
      - End result는 [DELETE] /v1/bookings/db와 동일
      - 취소 처리 후 SQS를 통해 비동기적으로 DB 반영 및 추가 작업 수행
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
    }),
    ApiOkResponseTemplate({
      description: '선착순 수강신청취소 성공 (high traffic)',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};
