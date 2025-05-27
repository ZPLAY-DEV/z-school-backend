import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { ParentRelationResponseDto } from '../dto/parent-relation-response.dto';
import { applyDecorators } from '@nestjs/common';

//? ---------------------------------------------------------------------- ?//
//? Private) 학부모의 자식 리스트 조회
//? ---------------------------------------------------------------------- ?//
export const ParentStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학부모의 자식 리스트 조회 ',
      description: `
        - 학부모의 정보와 자식 정보를 조회한다.
      `,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '학부모 ID',
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '학부모의 자식 리스트 조회 완료',
      type: ParentRelationResponseDto,
    }),
  );
};
