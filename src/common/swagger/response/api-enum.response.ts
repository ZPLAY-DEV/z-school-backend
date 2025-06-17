import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

export const ApiEnumResponseTemplate = <
  TEnum extends Record<string, any>,
>(options: {
  description?: string;
  type: TEnum;
}) => {
  const enumValues = Object.values(options.type).filter(
    (value) => typeof value === 'string' || typeof value === 'number',
  );

  return applyDecorators(
    ApiOkResponse({
      schema: {
        type: typeof enumValues[0] === 'string' ? 'string' : 'number',
        enum: enumValues,
        description: options.description || 'Enum 응답 결과',
        example: enumValues[0],
      },
    }),
  );
};
