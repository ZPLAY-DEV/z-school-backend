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
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Student } from 'src/domain/student/entities/student.entity';
import { UpdateParentDto } from '../dto/update-parent.dto';
import { Parent } from '../entities/parent.entity';

//? ---------------------------------------------------------------------- ?//
//? Find All Parents (Paginated)
//? ---------------------------------------------------------------------- ?//

export const FindAllParentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학부모 목록 조회 (페이지네이션)',
      description: `
      - 학부모 목록을 페이지네이션으로 조회합니다.
      `,
    }),
    ApiOkResponse({
      description: '학부모 목록 조회 완료',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(Parent) },
          },
          meta: {
            type: 'object',
            properties: {
              itemsPerPage: { type: 'number' },
              totalItems: { type: 'number' },
              currentPage: { type: 'number' },
              totalPages: { type: 'number' },
            },
          },
        },
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Parent
//? ---------------------------------------------------------------------- ?//

export const FindParentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학부모 상세 조회',
      description: `
      - 학부모 상세 정보를 조회합니다.
      - 연결된 학생 정보(students)를 포함합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: String,
      description: '학부모 ID',
    }),
    ApiExtraModels(Parent, Student),
    ApiOkResponse({
      description: '학부모 상세 조회 완료',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Parent) },
          {
            properties: {
              students: {
                type: 'array',
                items: { $ref: getSchemaPath(Student) },
                description: '연결된 학생 목록',
              },
            },
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Parent
//? ---------------------------------------------------------------------- ?//

export const UpdateParentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학부모 정보 수정',
      description: `
      - 학부모 정보를 수정합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학부모 ID',
    }),
    ApiBody({
      type: UpdateParentDto,
    }),
    ApiOkResponseTemplate({
      description: '학부모 정보 수정 완료',
      type: Parent,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Delete Parent
//? ---------------------------------------------------------------------- ?//

export const DeleteParentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학부모 삭제',
      description: `
      - 학부모를 삭제합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: String,
      description: '학부모 ID',
    }),
    ApiOkResponseTemplate({
      description: '학부모 삭제 완료',
      type: Parent,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
