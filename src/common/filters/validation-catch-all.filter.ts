import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { ValidationError } from 'class-validator';
import {
  HttpErrorConstants,
  HttpErrorFormat,
} from 'src/core/http/http-error-objects';

@Catch()
export class ValidationCatchAllFilter extends BaseExceptionFilter {
  constructor() {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    let httpStatus: number;
    let errorResponse: HttpErrorFormat;

    // Specifically handle validation errors with detailed logging
    if (
      exception instanceof BadRequestException &&
      this.isValidationError(exception)
    ) {
      httpStatus = exception.getStatus();
      errorResponse = {
        ...HttpErrorConstants.VALIDATE_ERROR,
        description: req.url,
      };

      // Log detailed validation errors
      this.logValidationErrors(exception, req);
    } else if (exception instanceof HttpException) {
      const response = exception.getResponse();
      httpStatus = exception.getStatus();

      if (
        typeof response === 'object' &&
        response !== null &&
        'error' in response &&
        'message' in response
      ) {
        errorResponse = {
          error: response['error'] as string,
          message: response['message'] as string,
          description: (response['description'] as string) ?? req.url,
        };
      } else {
        if (httpStatus === 401) {
          errorResponse = {
            ...HttpErrorConstants.UNAUTHORIZED,
            description: req.url,
          };
        } else {
          errorResponse = {
            ...HttpErrorConstants.UNEXPECTED_HTTP_EXCEPTION,
            description: req.url,
          };
        }

        if (typeof response === 'string') {
          errorResponse.message = response;
        }
      }
    } else {
      // General error handling
      httpStatus = 500;
      errorResponse = {
        ...HttpErrorConstants.INTERNAL_SERVER_ERROR,
        description: req.url,
      };

      // Override error message if available
      if (exception instanceof Error && exception.message) {
        errorResponse.message = exception.message;
      }
    }

    // Return response in HttpErrorFormat
    res.status(httpStatus).json(errorResponse);

    // Add context to Sentry for 500+ errors
    if (httpStatus >= 500) {
      Sentry.captureException(exception, (scope) => {
        scope.setTag('apiVersion', 'v1');
        scope.setTag('env', process.env.NODE_ENV);

        // User info
        if (req.user) {
          scope.setUser({
            id: req.user.id,
            email: req.user.email,
          });
        }

        // Request info
        scope.setExtra('method', req.method);
        scope.setExtra('url', req.originalUrl);
        scope.setExtra('query', req.query);
        scope.setExtra('params', req.params);
        scope.setExtra('body', req.body);
        scope.setExtra('headers', req.headers);
        scope.setExtra('errorResponse', errorResponse);

        return scope;
      });
    }
  }

  private isValidationError(exception: BadRequestException): boolean {
    const response = exception.getResponse();
    return (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      Array.isArray((response as any).message)
    );
  }

  private logValidationErrors(exception: BadRequestException, req: any): void {
    const response = exception.getResponse() as any;
    let validationErrors: ValidationError[] = [];

    // Extract validation errors
    if (Array.isArray(response.message)) {
      validationErrors = response.message;
    }

    // Create a more readable format for the validation errors
    const formattedErrors = this.formatValidationErrors(validationErrors);

    console.log('\n🔴 DTO Validation Error Details:');
    console.log(`URL: ${req.method} ${req.url}`);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Validation Errors:');
    console.log(JSON.stringify(formattedErrors, null, 2));
    console.log('\n');
  }

  private formatValidationErrors(
    errors: ValidationError[],
    parent = '',
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    if (!Array.isArray(errors)) {
      return result;
    }

    errors.forEach((error) => {
      const property = parent ? `${parent}.${error.property}` : error.property;

      // If it has nested constraints
      if (error.constraints) {
        result[property] = Object.values(error.constraints);
      }

      // If it has nested children errors
      if (error.children && error.children.length > 0) {
        Object.assign(
          result,
          this.formatValidationErrors(error.children, property),
        );
      }
    });

    return result;
  }
}
