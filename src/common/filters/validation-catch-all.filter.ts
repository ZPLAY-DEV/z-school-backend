import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';
import { KnownBlock } from '@slack/types';
import { ValidationError } from 'class-validator';
import { HttpErrorFormat } from 'src/common/interfaces';
import { SlackService } from 'src/services/slack/slack.service';
import { EntityNotFoundError } from 'typeorm';

@Catch()
export class ValidationCatchAllFilter extends BaseExceptionFilter {
  private readonly environment: string;

  constructor(
    private readonly slack: SlackService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
  }

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // Check if response is already sent
    if (res.headersSent) {
      console.warn('⚠️ Response already sent, skipping error handling');
      return;
    }

    let httpStatus: number;
    let errorResponse: HttpErrorFormat;

    // Handle BadRequestException (including validation errors)
    if (exception instanceof BadRequestException) {
      httpStatus = exception.getStatus();

      // Check if this is a validation error
      if (this.isValidationError(exception)) {
        // Extract and format validation errors for client response
        const validationErrors = this.extractValidationErrors(exception);
        const formattedErrors = this.formatValidationErrors(validationErrors);
        const errorMessages =
          this.convertToCommaSeparatedString(formattedErrors);

        errorResponse = {
          error: 'Bad Request',
          message:
            errorMessages || '입력값이 유효하지 않습니다. 다시 확인해주세요.',
          description: req.url,
        };

        // Log detailed validation errors for debugging
        this.logValidationErrors(exception, req);
      } else {
        // Handle other BadRequestExceptions normally
        const response = exception.getResponse();
        if (typeof response === 'string') {
          errorResponse = {
            error: 'Bad Request',
            message: response,
            description: req.url,
          };
        } else if (typeof response === 'object' && response !== null) {
          errorResponse = {
            error: 'Bad Request',
            message: (response as any).message || '잘못된 요청입니다.',
            description: req.url,
          };
        } else {
          errorResponse = {
            error: 'Bad Request',
            message: '잘못된 요청입니다.',
            description: req.url,
          };
        }
      }
    } else if (exception instanceof HttpException) {
      const response = exception.getResponse();
      httpStatus = exception.getStatus();

      if (
        typeof response === 'object' &&
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
            error: 'UNAUTHORIZED',
            message: '인증 오류가 발생했습니다.',
            description: req.url,
          };
        } else if (httpStatus === 404) {
          errorResponse = {
            error: 'NOT_FOUND',
            message:
              typeof response === 'string'
                ? response
                : '리소스를 찾을 수 없습니다.',
            description: req.url,
          };
        } else {
          errorResponse = {
            error: 'HTTP_EXCEPTION',
            message:
              typeof response === 'string' ? response : exception.message,
            description: req.url,
          };
        }

        if (typeof response === 'string') {
          errorResponse.message = response;
        }
      }
    } else {
      // TypeORM EntityNotFoundError 처리
      if (exception instanceof EntityNotFoundError) {
        httpStatus = 404;
        errorResponse = {
          error: 'ENTITY_NOT_FOUND',
          message: exception.message || '요청하신 데이터를 찾을 수 없습니다.',
          description: req.url,
        };
      } else {
        // 일반 오류 처리
        httpStatus = 500;
        errorResponse = {
          error: 'INTERNAL_SERVER_ERROR',
          message:
            exception instanceof Error
              ? exception.message
              : '알 수 없는 오류가 발생했습니다.',
          description: req.url,
        };
      }
    }

    // Return response in HttpErrorFormat
    try {
      res.status(httpStatus).json(errorResponse);
    } catch (responseError) {
      // If there's an error sending our custom response, fall back to super.catch()
      console.error('❌ Error sending custom response:', responseError);
      super.catch(exception, host);
      return;
    }

    // Add context to Sentry for 500+ errors and send Slack notification
    if (httpStatus >= 500 && this.environment !== 'dev') {
      Sentry.captureException(exception, (scope) => {
        scope.setTag('apiVersion', 'v1');
        scope.setTag('env', this.environment);

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

      // Send Slack notification
      this.notifySlack(exception, errorResponse).catch((e) =>
        console.error('🔴 Slack 전송 실패', e.stack),
      );
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

  private extractValidationErrors(
    exception: BadRequestException,
  ): ValidationError[] {
    const response = exception.getResponse() as any;
    let validationErrors: ValidationError[] = [];

    // Extract validation errors
    if (Array.isArray(response.message)) {
      validationErrors = response.message;
    }

    return validationErrors;
  }

  private logValidationErrors(exception: BadRequestException, req: any): void {
    const validationErrors = this.extractValidationErrors(exception);

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

  private convertToCommaSeparatedString(
    formattedErrors: Record<string, string[]>,
  ): string {
    const errorMessages: string[] = [];

    Object.entries(formattedErrors).forEach(([property, messages]) => {
      messages.forEach((message) => {
        errorMessages.push(`${property}: ${message}`);
      });
    });

    return errorMessages.join(', ');
  }

  async notifySlack(exception: unknown, errorResponse: HttpErrorFormat) {
    let query = 'n/a';
    let params = 'n/a';

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        query = (response as any)?.query ?? 'n/a';
        params = (response as any)?.parameters?.join(',') ?? 'n/a';
      }
    }

    const payload = {
      channel: 'error',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🔴 ${this.environment} 환경에서 오류 발생*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Error:*\n${errorResponse.error}`,
            },
            {
              type: 'mrkdwn',
              text: `*Message:*\n${errorResponse.message}`,
            },
            {
              type: 'mrkdwn',
              text: `*URL:*\n${errorResponse.description}`,
            },
            {
              type: 'mrkdwn',
              text: `*Query:*\n${query}`,
            },
            {
              type: 'mrkdwn',
              text: `*Params:*\n${params}`,
            },
          ],
        },
      ] as KnownBlock[],
    };
    await this.slack.sendMessage(payload);
  }
}
