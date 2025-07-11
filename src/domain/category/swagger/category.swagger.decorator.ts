import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Category } from '../entities/category.entity';

// GetList
export const GetCategoryListDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '📚 수업 분류 목록 조회',
      description: `
**📝 기능 설명**
- 시스템에 등록된 모든 수업 분류를 조회합니다
- 선택적으로 특정 분류만 필터링하여 조회할 수 있습니다
- 각 분류별 수업 개수 정보를 함께 제공합니다

**🔄 비즈니스 로직**
1. slug 파라미터가 없으면 전체 분류 목록 반환
2. slug 파라미터가 있으면 해당 분류만 필터링하여 반환
3. count 필드로 각 분류의 수업 개수 확인 가능
4. Public API로 인증 없이 접근 가능

**⚠️ 중요 제약사항**
- slug는 선택사항이며 유효한 Category enum 값이어야 함
- 잘못된 slug 값 입력 시 400 에러 반환
- 시스템 기본 분류만 조회 가능 (삭제 기능 없음)

**📚 예시 시나리오**
- 전체 분류 조회: 수업 생성 시 분류 선택 UI
- 무료 분류만 조회: slug=FREE_CUSTOM으로 필터링
      `,
    }),
    ApiQuery({
      name: 'slug',
      required: false,
      enum: ['FREE_CUSTOM', 'FREE_CARE', 'FREE_OPTIONAL', 'PAID_OPTIONAL'],
      description: '분류 필터 - 특정 분류만 조회할 때 사용',
      example: 'FREE_CUSTOM',
    }),
    ApiOkResponseTemplate({
      description: '분류 목록 조회 성공',
      type: Category,
      isArray: true,
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 slug 값',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: ['slug must be a valid enum value'],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
