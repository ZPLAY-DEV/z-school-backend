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
//? Create Booking
//? ---------------------------------------------------------------------- ?//

export const CreateBookingSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청',
      description: `
      - 실시간 피드백을 제공하는 선착순 수강신청 API입니다.
      - dto.pickRule에 따라 Redis 사용여부가 자동 결정됩니다.
      - 자세한 flow는 아래 Notion 링크 참고.
      - https://www.notion.so/v3-1e04351cd47a80c4b469feff94d03219
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
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
            isFormerStudent: true,
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
      description: '선착순 수강신청 성공',
      type: ResponseBookingDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
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
//? Cancel Booking
//? ---------------------------------------------------------------------- ?//

export const CancelBookingSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청 취소',
      description: `
      - 실시간 피드백을 제공하는 선착순 수강신청 취소 API입니다.
      - dto.pickRule에 따라 Redis 사용여부가 자동 결정됩니다.
      - 자세한 flow는 아래 Notion 링크 참고.
      - https://www.notion.so/v3-1e04351cd47a80c4b469feff94d03219
      - https://www.notion.so/v3-SQS-using-LocalStack-1c94351cd47a8040becde67391819808
      - 이 명령실행 후 몇개의 DB 레코드가 업데이트 될지 그 숫자가 반환됩니다.
      `,
    }),
    ApiBody({
      type: CancelBookingDto,
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '선착순 수강신청취소 성공',
      type: Number,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_DATABASE_ERROR],
      },
    ]),
  );
};
