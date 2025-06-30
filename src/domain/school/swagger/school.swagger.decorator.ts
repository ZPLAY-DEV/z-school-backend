import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
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
      type: School,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
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
      - 학교별 isFrugal 최초 생성시 false 로 설정되어 있으며, 학교에서 true 로 절약모드를 선택할 수 있다.
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
            isFrugal: true,
          },
        },
      },
    }),
    ApiExtraModels(School),
    ApiOkResponse({
      description: '학교 수정 완료',
      type: School,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};

export const FindSchoolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: '학교 상세 조회' }),
    ApiParam({ name: 'id', type: Number, description: '학교 ID' }),
    ApiOkResponse({
      description: '학교 상세 조회 완료',
      type: School,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
