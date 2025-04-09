import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class DuplicateEntryErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (
          error instanceof QueryFailedError &&
          (error.message.match(/.*?Unique constraint/) ||
            error.message.match(/.*?Duplicate entry/))
        ) {
          return throwError(() => new BadRequestException('already taken'));
        }
        // 다른 에러는 그대로 던짐
        return throwError(() => error);
      }),
    );
  }
}
