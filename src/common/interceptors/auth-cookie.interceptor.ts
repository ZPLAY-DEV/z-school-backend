import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, tap } from 'rxjs';
import { ONE_HOUR, THIRTY_DAYS } from 'src/common/constants';

@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        const { result } = data;
        if (result && result.accessToken && result.refreshToken) {
          const response = context.switchToHttp().getResponse();

          response.cookie('access_token', result.accessToken, {
            maxAge: ONE_HOUR,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          });

          response.cookie('refresh_token', result.refreshToken, {
            maxAge: THIRTY_DAYS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          });
        }
      }),
    );
  }
}
