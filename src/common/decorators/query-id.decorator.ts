import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const QueryId = createParamDecorator(
  (data: string, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const queries = request.query;

    return data ? +queries[data] : queries;
  },
);
