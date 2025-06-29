import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';

import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { SamResponseDto } from '../../sam/dto/sam-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Read School > Term > Sam List
//? ---------------------------------------------------------------------- ?//
export const SchoolTermSamListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 학기 > 강사 목록 조회',
      description: `
      - 특정 학교의 특정 학기에 속한 강사(sam) 목록 조회
      - 해당 학기에 수업을 담당하는 강사들만 조회됩니다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
    }),
    ApiOkResponseTemplate({
      description: '학교 > 학기에 속한 강사(sam) 목록 조회 완료',
      type: SamResponseDto,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
