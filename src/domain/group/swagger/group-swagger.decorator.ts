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
import { RemovalStatus } from 'src/common/enums';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiEnumResponseTemplate } from 'src/common/swagger/response/api-enum.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { Pick } from '../../pick/entities/pick.entity';

//? ---------------------------------------------------------------------- ?//
//? Create Group
//? ---------------------------------------------------------------------- ?//

export const CreateGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 👈 생성',
      description: `
      - 반 생성
      `,
    }),
    ApiBody({
      type: CreateGroupDto,
    }),
    ApiCreatedResponseTemplate({
      description: '반 등록 완료',
      type: Group,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

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
    ApiExtraModels(Group, Pick),
    ApiOkResponse({
      description: '반 상세 조회 완료 (picks 관계 포함)',
      schema: {
        allOf: [
          { $ref: getSchemaPath(Group) },
          {
            properties: {
              picks: {
                type: 'array',
                items: { $ref: getSchemaPath(Pick) },
                description: '연결된 학생 목록 포함됨',
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
      description: '반 수정 완료 (picks 관계 포함 안됨)',
      type: Group,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
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
      - deletedBy는 API 호출하는 사람의 role 에 따란 자동으로 매니져|강사|기타 중 하나로 설정됩니다.
      `,
    }),
    ApiBody({
      type: DeleteGroupDto,
    }),
    ApiEnumResponseTemplate({
      description: '상태 리턴',
      type: RemovalStatus,
    }),
    ApiStatuses(StatusCodes.UNPROCESSABLE_ENTITY),
  );
};
