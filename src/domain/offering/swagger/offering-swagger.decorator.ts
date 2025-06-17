import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
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
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
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
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 상세 조회 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
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
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
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
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
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
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강신청과목 삭제 완료',
      type: Offering,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Set Former Student IDs
//? ---------------------------------------------------------------------- ?//

export const SetFormerStudentIdsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 👈 이전 수강생 ID 수동 설정',
      description: `
      - lessonName을 받아서 이전 학기의 동일한 과목을 수강한 학생들의 ID를 찾아 설정
      - 해당 과목을 수강한 학생들의 ID 목록을 offering.formerStudentIds에 자동으로 저장
      - 반환값은 설정된 이전 수강생 수 (number)
      - 수강생 확정시 수강신청한 학생 ID와 formerStudentIds를 이용하여 재수강생 목록을 뽑을 수 있음
      `,
    }),
    ApiParam({
      name: 'id',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          lessonName: {
            type: 'string',
            description: '과목명 (이전 학기에서 동일한 과목을 찾기 위함)',
            example: '수학',
          },
        },
        required: ['lessonName'],
      },
    }),
    ApiOkResponse({
      description: '이전 수강생 ID 설정 완료',
      schema: {
        type: 'number',
        description: '설정된 이전 수강생 수',
        example: 15,
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
