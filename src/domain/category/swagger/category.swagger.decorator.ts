import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
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

// Seed
export const SeedCategoryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '⚙️ 분류 기본 데이터 생성',
      description: `
**📝 기능 설명**
- 시스템 초기화 시 필요한 기본 분류 데이터를 생성합니다
- 4개의 표준 분류를 자동으로 등록합니다
- 이미 존재하는 분류는 건너뛰고 새로운 분류만 추가합니다

**🔄 비즈니스 로직**
1. FREE_CUSTOM: 늘봄맞춤무료 분류 생성
2. FREE_CARE: 돌봄선택무료 분류 생성
3. FREE_OPTIONAL: 늘봄선택무료 분류 생성
4. PAID_OPTIONAL: 늘봄선택유료 분류 생성
5. 중복 생성 방지로 안전한 재실행 가능

**⚠️ 중요 제약사항**
- 시스템 초기화 시에만 실행 권장
- 이미 데이터가 있는 환경에서는 신중히 사용
- 관리자 권한 필요 (현재는 인증 체크 없음)

**📚 예시 시나리오**
- 새로운 서버 환경 구축 시 기본 데이터 생성
- 개발/테스트 환경 초기화
      `,
    }),
    ApiOkResponse({
      description: '시드 데이터 생성 완료 - 생성된 분류 수 반환',
      schema: {
        type: 'number',
        example: 4,
        description: '새로 생성된 분류의 개수',
      },
    }),
    ApiResponse({
      status: 500,
      description: '데이터베이스 오류',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Database connection failed' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    }),
    ApiStatuses(StatusCodes.INTERNAL_SERVER_ERROR),
  );
