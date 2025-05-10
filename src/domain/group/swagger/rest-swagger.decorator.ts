import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { RemovalStatus } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiEnumResponseTemplate } from 'src/core/swagger/response/api-enum.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';

//? ---------------------------------------------------------------------- ?//
//? Delete Group
//? ---------------------------------------------------------------------- ?//

export const FindGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 상세 조회',
      description: `
      - 반 상세 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '반 ID',
    }),
    ApiOkResponse({
      type: Group,
      description: '반 상세 조회 완료',
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};

export const DeleteGroupDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반 삭제',
      description: `
      - 반을 삭제합니다.,
      - body.note 에 삭제하는 사유를 남겨야만 처리 가능합니다.
      - pending 상태에서는 물리적으로 삭제됩니다. (deleted)
      - active 상태에서는 삭제하지 않고 상태만 폐강처리 합니다. (canceled)
      - canceled 상태에서는 연결된 학생이 없어야지만 삭제됩니다. (soft_deleted)
      - 연결된 학생이 있는 경우 422 에러 발생
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
