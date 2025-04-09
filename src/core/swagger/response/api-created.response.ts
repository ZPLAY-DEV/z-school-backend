import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreatedResponseDto } from '../dto/created-response.dto';

/**
 * 201 created response 템플릿 - 타입 설정이 필요한 경우 별도로 사용. created idx 이외의 다른 데이터도 필요할 때
 * Api Created Response Template에서 별도로 Response에 데이터를 담아서 return 하기 위해선 별도의 DTO를 인자값으로 넘겨야함.
 * @param description: 문서 설명
 * @param type: DTO
 * @param isArray: boolean
 * */
export const ApiCreatedResponseTemplate = <
  DtoClass extends Type<unknown>,
>(params?: {
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
          { $ref: getSchemaPath(CreatedResponseDto) },
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
      ApiExtraModels(CreatedResponseDto, params?.type),
      ApiCreatedResponse(schema),
    );
  } else {
    const schema = {
      description: params?.description,
      schema: {
        allOf: [
          // ResponseDto 의 프로퍼티를 가져옴
          { $ref: getSchemaPath(CreatedResponseDto) },
        ],
      },
    };
    return applyDecorators(
      ApiExtraModels(CreatedResponseDto),
      ApiCreatedResponse(schema),
    );
  }
};
