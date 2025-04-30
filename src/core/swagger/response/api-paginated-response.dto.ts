// api-paginated-response.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
  ApiResponseDto,
  PaginationResponseDto,
} from '../dto/ok-response-paginated.dto';

export const ApiPaginatedResponseTemplate = <
  DtoClass extends Type<unknown>,
>(params: {
  description?: string;
  type: DtoClass;
}) => {
  const schema = {
    description: params.description || 'Paginated response',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            result: {
              type: 'object',
              allOf: [
                { $ref: getSchemaPath(PaginationResponseDto) },
                {
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: getSchemaPath(params.type) },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginationResponseDto, params.type),
    ApiOkResponse(schema),
  );
};
