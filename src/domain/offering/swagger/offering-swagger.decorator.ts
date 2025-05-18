import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
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

//? ---------------------------------------------------------------------- ?//
//? Find Immediately Previous Term ID
//? ---------------------------------------------------------------------- ?//

export const FindImmediatelyPreviousTermIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 직전 학기 ID 조회',
      description: `
      - 호출하면 지난 학교ID 와 학기ID 를 스스로 이용하여 바로 전학기의 ID 를 리턴한다. 없으면 404 오류 반환
      - 해당 수강신청과목이 속한 학기의 바로 전 학기 ID를 조회
      - 해당 학교의 학기 일정 정보를 기준으로 현재 학기 직전에 등록된 학기를 찾음
      `,
    }),
    ApiOkResponse({
      description: '직전 학기 ID 조회 완료',
      schema: {
        type: 'number',
        example: 123,
      },
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.CONDITION_NOT_MET],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Set Former Student IDs
//? ---------------------------------------------------------------------- ?//

export const SetFormerStudentIdsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 이전 수강생 ID 설정',
      description: `
      - dto.offeringIds 에 이전 학기의 수강신청과목 ID들을 넣고 호출
      - 해당 과목을 수강한 학생들의 ID 목록을 리턴할 뿐만 아니라 offering.formerStudentIds에 자동으로 저장된다.
      - flow 를 설명하자면, 따라서, 수강생 확정시 수강신청한 학생아이디와 formerStudentIds를 이용하여 union 하면 재수강생 목록을 뽑을 수 있다.
      `,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          offeringIds: {
            type: 'array',
            items: {
              type: 'number',
            },
            description: '이전학기 수강과목들의 ID 목록',
            example: [101, 102, 103],
          },
        },
        required: ['offeringIds'],
      },
    }),
    ApiOkResponse({
      description: '이전 수강생 ID 설정 완료',
      schema: {
        type: 'array',
        items: {
          type: 'number',
        },
        example: [1001, 1002, 1003],
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
