import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { StatusCodes } from 'http-status-codes';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { SchoolResponseDto } from '../dto/school-response.dto';
import { School } from '../entities/school.entity';

//? ---------------------------------------------------------------------- ?//
//? Private) Create School
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 생성 (학교 관리자 전용)',
      description: `
      - 학교를 생성한다.
      - 기본적으로 모든 Create는 Upsert로 처리된다.
      `,
    }),
    ApiBody({
      type: CreateSchoolDto,
    }),
    ApiCreatedResponse({
      description: '학생 생성 완료',
      type: SchoolResponseDto,
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
//? Private) Update School
//? ---------------------------------------------------------------------- ?//
export const UpdateSchoolDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 수정',
      description: `
      - 학교를 수정한다.
      - 학교별 messageType은 최초 생성시 Default로 ALL로 설정되어 있으며, 학교에서 유동적으로 SMS, FCM 메시지 전송 여부를 선택할 수 있다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교 ID',
      required: true,
      example: 1,
    }),
    ApiBody({
      type: UpdateSchoolDto,
      examples: {
        example1: {
          value: {
            messageType: 'SMS',
          },
        },
      },
    }),
    ApiExtraModels(School),
    ApiOkResponse({
      description: '학교 수정 완료',
      type: SchoolResponseDto,
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
