import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginateConfig } from 'nestjs-paginate';
import { HttpPaginatedResponseDto } from 'src/core/swagger/dto/ok-response-paginated.dto';

export const ApiOkPaginatedResponseDocs = <TModel extends Type<unknown>>(
  model: TModel,
  paginateConfig?: PaginateConfig<any>,
) => {
  return applyDecorators(
    ApiExtraModels(model, HttpPaginatedResponseDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(HttpPaginatedResponseDto) },
          {
            properties: {
              statusCode: {
                type: 'number',
                example: 200,
                description: 'HTTP 상태 코드',
              },
              message: {
                type: 'string',
                example: 'OK',
                description: '응답 메시지',
              },
              result: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                    description: '페이지네이션 결과 데이터',
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      itemsPerPage: {
                        type: 'number',
                        example: paginateConfig?.defaultLimit || 20,
                        description: '페이지당 항목 수',
                      },
                      totalItems: {
                        type: 'number',
                        example: 100,
                        description: '총 항목 수',
                      },
                      currentPage: {
                        type: 'number',
                        example: 1,
                        description: '현재 페이지',
                      },
                      totalPages: {
                        type: 'number',
                        example: 5,
                        description: '총 페이지 수',
                      },
                      sortBy: {
                        type: 'array',
                        example: paginateConfig?.defaultSortBy || [
                          ['id', 'DESC'],
                        ],
                        description: '정렬 기준',
                        items: {
                          type: 'array',
                          items: {
                            type: 'string',
                          },
                        },
                      },
                      searchBy: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        example: paginateConfig?.searchableColumns || [],
                        description: '검색 가능 필드',
                      },
                      search: {
                        type: 'string',
                        example: '',
                        description: '검색어',
                      },
                      filter: {
                        type: 'object',
                        additionalProperties: true,
                        description: '필터링 조건',
                      },
                    },
                    description: '페이지네이션 메타데이터',
                  },
                  links: {
                    type: 'object',
                    properties: {
                      first: {
                        type: 'string',
                        example: '/?page=1&limit=20&sortBy=id:DESC',
                        description: '첫 페이지 URL',
                      },
                      previous: {
                        type: 'string',
                        example: null,
                        description: '이전 페이지 URL',
                      },
                      current: {
                        type: 'string',
                        example: '/?page=1&limit=20&sortBy=id:DESC',
                        description: '현재 페이지 URL',
                      },
                      next: {
                        type: 'string',
                        example: '/?page=2&limit=20&sortBy=id:DESC',
                        description: '다음 페이지 URL',
                      },
                      last: {
                        type: 'string',
                        example: '/?page=5&limit=20&sortBy=id:DESC',
                        description: '마지막 페이지 URL',
                      },
                    },
                    description: '페이지네이션 링크',
                  },
                },
              },
            },
          },
        ],
      },
    }),
  );
};
