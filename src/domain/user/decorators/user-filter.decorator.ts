import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * refine 의 like query 에 대응하기 위한 decorator
 */
export const UserFilter = createParamDecorator(
  (data: string, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const queries = request.query;

    const filter = queries['role']
      ? {
          filter: { role: queries['role'] },
        }
      : {};

    if (queries['username_like']) {
      return {
        ...filter,
        search: queries['username_like'],
        searchBy: 'username',
      };
    }
    if (queries['email_like']) {
      return {
        ...filter,
        search: queries['email_like'],
        searchBy: 'email',
      };
    }

    return { ...filter };
  },
);
