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
import { DeleteSamNoteDto } from 'src/domain/sam/dto/delete-sam-note.dto';
import { Shortlink } from '../entities/shortlink.entity';

//? ---------------------------------------------------------------------- ?//
//? List Shortlinks
//? ---------------------------------------------------------------------- ?//

export const ListShortlinksDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '숏링크 목록 조회',
      description: `
      - 전체 숏링크 목록을 조회합니다.
      - 뉴스레터 발송을 위해 생성된 모든 숏링크를 확인할 수 있습니다.
      `,
    }),
    ApiExtraModels(Shortlink),
    ApiOkResponse({
      description: '숏링크 목록 조회 완료',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(Shortlink) },
        description: '숏링크 목록',
      },
    }),
    ApiStatuses(StatusCodes.INTERNAL_SERVER_ERROR),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Find Shortlink By ID
//? ---------------------------------------------------------------------- ?//

export const FindShortlinkByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '숏링크 상세 조회',
      description: `
      - 특정 ID로 숏링크의 상세 정보를 조회합니다.
      - 연관된 부모(parent)와 뉴스레터(newsletter) 정보도 함께 조회됩니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '숏링크 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '숏링크 상세 조회 완료',
      type: Shortlink,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Shortlink
//? ---------------------------------------------------------------------- ?//

export const SoftDeleteShortlinkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '숏링크 소프트 삭제',
      description: `
      - 특정 숏링크를 소프트 삭제합니다.
      - 실제로 데이터를 삭제하지 않고 삭제 표시만 합니다.
      - 삭제 사유와 삭제자 정보를 기록합니다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '숏링크 ID',
      example: 1,
    }),
    ApiBody({
      type: DeleteSamNoteDto,
      description: '삭제 정보',
      examples: {
        example1: {
          summary: '삭제 예제',
          value: {
            reason: '더 이상 필요없는 숏링크',
            deletedBy: 1,
          },
        },
      },
    }),
    ApiOkResponse({
      description: '숏링크 삭제 완료',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
            description: '삭제 성공 여부',
          },
        },
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
