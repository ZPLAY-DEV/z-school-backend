import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IRequestUser } from 'src/common/interfaces';

interface RequestWithUser extends Request {
  user: IRequestUser;
}

export const CurrentRefreshToken = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user ?? {};
  },
);
