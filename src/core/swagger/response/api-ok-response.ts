import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from '../dto/ok-response.dto';

/** 200(OK) Response Template */
export const ApiOkResponseTemplate = <DtoClass extends Type<unknown>>(params?: {
  description?: string;
  type?: DtoClass;
  isArray?: boolean;
}) => {
  if (params?.type) {
    const schema = {
      description: params.description,
      schema: {
        allOf: [
          // ResponseDto 의 프로퍼티를 가져옴
          { $ref: getSchemaPath(ResponseDto) },

          {
            properties: {
              result: params.isArray
                ? {
                    type: 'array',
                    items: { $ref: getSchemaPath(params.type) },
                  }
                : {
                    $ref: getSchemaPath(params.type),
                  },
            },
          },
        ],
      },
    };
    return applyDecorators(
      ApiExtraModels(ResponseDto, params?.type),
      ApiOkResponse(schema),
    );
  } else {
    const schema = {
      description: params?.description,
      schema: {
        allOf: [
          // ResponseDto 의 프로퍼티를 가져옴
          { $ref: getSchemaPath(ResponseDto) },
        ],
      },
    };
    return applyDecorators(ApiExtraModels(ResponseDto), ApiOkResponse(schema));
  }
};
