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
import { RemovalStatus } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiEnumResponseTemplate } from 'src/core/swagger/response/api-enum.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupStudent } from '../entities/group-student.entity';

//? ---------------------------------------------------------------------- ?//
//? Find Group
//? ---------------------------------------------------------------------- ?//

export const FindGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 👈 상세 조회',
      description: `
      - 반 상세 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '반 ID',
    }),
    ApiExtraModels(Group, GroupStudent),
    ApiOkResponse({
      description: '반 상세 조회 완료 (groupStudents 관계 포함)',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Group) },
          {
            properties: {
              groupStudents: {
                type: 'array',
                items: { $ref: getSchemaPath(GroupStudent) },
                description: '연결된 학생 목록 포함됨',
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
//? Update Group
//? ---------------------------------------------------------------------- ?//

export const UpdateGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 정보 👈 수정',
      description: `
      - 반 id 만을 가지고 정보를 업데이트.
      - Request 의 UpdateGroupDto 는 PartialType(CreateGroupDto) 로 변경 원하는 필드만 작성
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '반 ID',
    }),
    ApiBody({
      type: UpdateGroupDto,
      examples: {
        example1: {
          value: {
            location: '반 위치',
            note: '완전 인기 반',
          },
        },
      },
    }),
    ApiExtraModels(Group),
    ApiOkResponseTemplate({
      description: '반 수정 완료 (groupStudents 관계 포함 안됨)',
      type: Group,
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
//? Delete Group
//? ---------------------------------------------------------------------- ?//

export const DeleteGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 👈 삭제',
      description: `
      - 반을 삭제합니다.
      - note 에 삭제하는 사유를 남겨야만 처리 가능합니다.
      - pending 상태에서는 물리적으로 삭제됩니다. (deleted) 단, 연결된 학생이 있는 경우 422 에러 발생
      - active 상태에서는 삭제하지 않고 상태만 폐강처리 합니다. (canceled)
      - canceled 상태에서는 soft 삭제됩니다. (soft_deleted) 단, 연결된 학생이 있는 경우 422 에러 발생
      - RemovalStatus (deleted, canceled, soft_deleted) 를 리턴합니다.
      `,
    }),
    ApiBody({
      type: DeleteGroupDto,
    }),
    ApiEnumResponseTemplate({
      description: '상태 리턴',
      type: RemovalStatus,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.UNPROCESSABLE_ENTITY,
        errorFormatList: [HttpErrorConstants.CONDITION_NOT_MET],
      },
    ]),
  );
};
