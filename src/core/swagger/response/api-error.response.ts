import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import { HttpErrorFormat } from 'src/core/http/http-error-objects';

/**
 * Swagger API Error Response Template
 * 비즈니스 로직에서 반환되는 Error를 정의해서 인자로 전달
 * */
export const ApiErrorResponseTemplate = (
  paramsList: {
    status?: number;
    errorFormat?: HttpErrorFormat;
    errorFormatList?: HttpErrorFormat[];
  }[],
) => {
  const decorators: Array<ClassDecorator> = paramsList
    .map((params) => {
      const { status, errorFormatList } = params;

      if (errorFormatList) {
        const errorParams: ApiResponseOptions = {
          status: status,
          description: errorFormatList.reduce((prev, current) => {
            prev =
              prev +
              `- ${current.error}: ${current.description || current.message}     \n`;
            return prev;
          }, ``),
          content: {
            'application/json': {
              examples: errorFormatList.reduce((prev, current) => {
                prev[current.error] = {
                  value: {
                    status,
                    message: current.message,
                    error: current.error,
                  },
                };
                return prev;
              }, {}),
            },
          },
        };
        return ApiResponse(errorParams);
      }
      return undefined;
    })
    .filter(
      (decorator): decorator is ClassDecorator => decorator !== undefined,
    );

  return applyDecorators(...decorators);
};
