import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { ValidationError } from 'class-validator';
import { HttpErrorFormat } from 'src/common/interfaces';
import { EntityNotFoundError } from 'typeorm';

@Catch()
export class MyCatchAllFilter implements ExceptionFilter {
  @SentryExceptionCaptured() // 데코레이터가 Sentry 전송 담당
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    if (res.headersSent) {
      console.warn('⚠️ Response already sent, skipping error handling');
      return;
    }

    let httpStatus = 500;
    let errorResponse: HttpErrorFormat = {
      error: 'INTERNAL_SERVER_ERROR',
      message: '알 수 없는 오류가 발생했습니다.',
      description: req.url,
    };

    // BadRequestException 처리
    if (exception instanceof BadRequestException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        errorResponse = {
          error: 'Bad Request',
          message: response,
          description: req.url,
        };
      } else if (typeof response === 'object' && response !== null) {
        const messages = Array.isArray((response as any).message)
          ? (response as any).message.join(', ')
          : (response as any).message || '잘못된 요청입니다.';
        errorResponse = {
          error: 'Bad Request',
          message: messages,
          description: req.url,
        };
      }
    }
    // HttpException 처리
    else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();
      errorResponse = {
        error: (response as any)?.error || 'HTTP_EXCEPTION',
        message: (response as any)?.message || exception.message,
        description: req.url,
      };
    }
    // EntityNotFoundError 처리
    else if (exception instanceof EntityNotFoundError) {
      httpStatus = 404;
      errorResponse = {
        error: 'ENTITY_NOT_FOUND',
        message: exception.message || '데이터를 찾을 수 없습니다.',
        description: req.url,
      };
    }
    // 일반 Error 처리
    else if (exception instanceof Error) {
      httpStatus = 500;
      errorResponse = {
        error: 'INTERNAL_SERVER_ERROR',
        message: exception.message,
        description: req.url,
      };
    }

    // 클라이언트에 JSON 응답
    res.status(httpStatus).json(errorResponse);

    // 참고: @SentryExceptionCaptured() 데코레이터가 이벤트 전송 담당
    // 필요 시 아래처럼 수동 전송도 가능
    // if (httpStatus >= 500) {
    //   Sentry.withScope((scope) => {
    //     scope.setTag('method', req.method);
    //     scope.setTag('url', req.originalUrl);
    //     scope.setExtra('body', req.body);
    //     Sentry.captureException(exception);
    //   });
    // }
  }

  // 유틸 함수들 (필요시 ValidationError 메시지 처리)
  private isValidationError(exception: BadRequestException): boolean {
    const response = exception.getResponse();
    return (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      Array.isArray((response as any).message)
    );
  }

  private extractValidationErrors(
    exception: BadRequestException,
  ): ValidationError[] {
    const response = exception.getResponse() as any;
    return Array.isArray(response.message)
      ? (response.message as ValidationError[])
      : [];
  }

  private formatValidationErrors(
    errors: ValidationError[],
    parent = '',
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    errors.forEach((error) => {
      const property = parent ? `${parent}.${error.property}` : error.property;
      if (error.constraints)
        result[property] = Object.values(error.constraints);
      if (error.children && error.children.length > 0) {
        Object.assign(
          result,
          this.formatValidationErrors(error.children, property),
        );
      }
    });
    return result;
  }

  private convertToCommaSeparatedString(
    formattedErrors: Record<string, string[]>,
  ): string {
    const errorMessages: string[] = [];
    Object.entries(formattedErrors).forEach(([prop, messages]) => {
      messages.forEach((msg) => errorMessages.push(`${prop}: ${msg}`));
    });
    return errorMessages.join(', ');
  }
}
