import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('auth') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    //? just for your information,
    //? check if this request is invoking public() method in the controllers
    //? to avoid any attepmts to include user payload in the context.request.
    //? this makes sense since the user payload comes from a valid JWT Token.
    //? which also means only id (userId) and primary key (email) will be
    //? available within the context.request for all the protected methods.
    //?
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
