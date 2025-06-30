import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { ResponseCreateOfferingPickDto } from 'src/domain/group/dto/response-create-offering-pick.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Offering Pick
//? ---------------------------------------------------------------------- ?//

export const CreateOfferingPickDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수강신청과목 > 수강생확정 👈 생성',
      description: `
      - 수강신청과목에 대해 수강생을 확정합니다 (선착순/추첨/이전수강생 우선 등)
      - 해당 수강신청과목의 pickRule에 따라 수강생을 자동으로 선별합니다
      - 수강신청한 학생들 중에서 조건에 맞는 학생들을 최종 수강생으로 확정합니다
      `,
    }),
    ApiParam({
      name: 'offeringId',
      description: '수강신청과목 ID',
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강생 확정 완료',
      type: ResponseCreateOfferingPickDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
