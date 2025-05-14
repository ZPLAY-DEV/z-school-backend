import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateOfferingDto } from '../dto/create-offering.dto';
import { UpdateOfferingDto } from '../dto/update-offering.dto';
import { Offering } from '../entities/offering.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Offering
//? ---------------------------------------------------------------------- ?//

export const CreateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 생성',
      description: `
      - 수강신청과목 생성
      `,
    }),
    ApiBody({
      type: CreateOfferingDto,
    }),
    ApiCreatedResponseTemplate({
      description: '수강신청과목 등록 완료',
      type: Offering,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Offering by ID
//? ---------------------------------------------------------------------- ?//

export const GetOfferingByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 상세 조회',
      description: `
      - 수강신청과목 ID로 상세 정보 조회
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 상세 조회 완료',
      type: Offering,
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
//? Update Offering
//? ---------------------------------------------------------------------- ?//

export const UpdateOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 수정',
      description: `
      - 수강신청과목 업데이트
      - Request의 UpdateOfferingDto는 PartialType(CreateOfferingDto)로 변경 원하는 필드만 작성
      `,
    }),
    ApiBody({
      type: UpdateOfferingDto,
      examples: {
        example1: {
          value: {
            lessonName: '과목명',
            groupName: '반 이름',
          },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 업데이트 완료',
      type: Offering,
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
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Remove Offering
//? ---------------------------------------------------------------------- ?//

export const RemoveOfferingDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 삭제',
      description: `
      - 수강신청과목 삭제 (소프트 삭제)
      `,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 삭제 완료',
      type: Offering,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
