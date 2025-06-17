import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Category } from 'src/common/enums';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Category as CategoryEntity } from 'src/domain/category/entities/category.entity';

//? ---------------------------------------------------------------------- ?//
//? Get Category List
//? ---------------------------------------------------------------------- ?//

export const GetCategoryListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '분류 👈 리스트 (all)',
      description: `
      - 과목 분류 목록을 조회합니다.
      - 선택적으로 slug 파라미터를 통해 특정 분류를 필터링할 수 있습니다.
      `,
    }),
    ApiQuery({
      name: 'slug',
      required: false,
      enum: Category,
      description: '카테고리 슬러그 (선택적)',
    }),
    ApiOkResponseTemplate({
      description: '카테고리 목록',
      type: CategoryEntity,
      isArray: true,
    }),
  );
};
