import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/** 200(OK) Response Template */
export const ApiOkResponseTemplate = <DtoClass extends Type<unknown>>(params?: {
  description?: string;
  type?: DtoClass;
  isArray?: boolean;
}) => {
  if (params?.type) {
    const schema = {
      description: params.description,
      schema: params.isArray
        ? {
            type: 'array',
            items: { $ref: getSchemaPath(params.type) },
          }
        : {
            $ref: getSchemaPath(params.type),
          },
    };
    return applyDecorators(ApiExtraModels(params.type), ApiOkResponse(schema));
  } else {
    return applyDecorators(
      ApiOkResponse({
        description: params?.description,
      }),
    );
  }
};
