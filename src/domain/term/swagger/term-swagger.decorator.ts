import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { CreateTermDto } from '../dto/create-term.dto';
import { UpdateTermDto } from '../dto/update-term.dto';
import { Term } from '../entities/term.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Term
//? ---------------------------------------------------------------------- ?//

export const CreateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 생성',
      description: `
      - 학교에 귀속된 늘봄 학기를 생성.
      - 날짜 형식은 YYYY-MM-DD 형식으로 입력.
      - 기간 시작일이 종료일 보다 앞서야 함 -> 시작일보다 종료일이 앞설 경우 400 Validation Error 발생.
      - 수강신청 시작일과 종료일은 학기 시작 전에 있어야 함. (!)
      `,
    }),
    ApiBody({
      type: CreateTermDto,
    }),
    ApiCreatedResponseTemplate({
      description: '학기 등록 완료',
      type: Term,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Term
//? ---------------------------------------------------------------------- ?//

export const FindTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 상세 조회',
      description: `
      - 학기 상세 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiExtraModels(Term, Lesson),
    ApiOkResponse({
      description: '학기 상세 조회 완료 (lessons, offerings 관계 포함)',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Term) },
          {
            properties: {
              lessons: {
                type: 'array',
                items: { $ref: getSchemaPath(Lesson) },
                description: '연결된 수업 목록 포함됨',
              },
            },
          },
        ],
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Term
//? ---------------------------------------------------------------------- ?//

export const UpdateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 정보 수정',
      description: `
      - 학교에 귀속된 늘봄 학기 수정
      - bookingStart 속성값을 최초 입력시, 수강신청과목 (offerings) 테이블이 생성되고, isBookingReady 가 true 로 변경됨.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiBody({
      type: UpdateTermDto,
      examples: {
        example1: {
          value: {
            termName: '2025-2학기',
            bookingStart: '2025-08-20T00:00:00Z',
            bookingEnd: '2025-08-25T23:59:59Z',
          },
        },
      },
    }),
    ApiExtraModels(Term),
    ApiOkResponseTemplate({
      description: '학기 수정 완료',
      type: Term,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Term
//? ---------------------------------------------------------------------- ?//

export const DeleteTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학기 삭제',
      description: `
      - 학기 삭제 (소프트 삭제)
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학기 삭제 완료',
      type: Term,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
