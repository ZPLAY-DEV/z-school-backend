import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ResponseSchoolTermComboDto } from '../dto/response-school-term-combo.dto';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Combo
//? ---------------------------------------------------------------------- ?//

export const GetSchoolTermComboDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 학기 정보에 필요한 강좌, 강사, 학생 정보 한번에 조회',
      description: `
      - 특정 학교와 학기에 대한 통합 정보를 조회합니다.
      - 학교 정보, 학기 정보, 관련된 모든 데이터를 한 번에 가져옵니다.
      - 공개 API로 인증 없이 접근 가능합니다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiExtraModels(ResponseSchoolTermComboDto),
    ApiOkResponse({
      description: '학교 학기 콤보 정보 조회 완료',
      schema: {
        $ref: getSchemaPath(ResponseSchoolTermComboDto),
        description: '학교와 학기의 통합 정보',
      },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
