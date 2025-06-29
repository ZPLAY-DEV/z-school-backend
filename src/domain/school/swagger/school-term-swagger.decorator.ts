import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Term } from 'src/domain/term/entities/term.entity';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Combo
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 학기 목록 조회',
      description: `
      - 특정 학교의 학기 목록을 조회합니다.
      - 해당 학교에 등록된 모든 학기 정보를 반환합니다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiOkResponseTemplate({
      description: '학교 학기 목록 조회 완료',
      type: Term,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
