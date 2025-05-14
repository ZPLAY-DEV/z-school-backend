import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    return +userId;
  },
);

export const CurrentUserIdAndRole = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    return {
      id: request.user.id,
      role: request.user.role,
    };
  },
);
