import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';
import { KnownBlock } from '@slack/types';
import { HttpErrorFormat } from 'src/common/interfaces';
import { SlackService } from 'src/services/slack/slack.service';
import { EntityNotFoundError } from 'typeorm';

// todo. Sentry DSN 를 v3 용으로 Sentry 콘솔에서 새로 발급하는 게 좋을듯.
@Catch()
export class SentryCatchAllFilter extends BaseExceptionFilter {
  constructor(private readonly slack: SlackService) {
    super();
  }

  @SentryExceptionCaptured() // Sentry 대쉬보드에 오류정보 추가
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    let httpStatus: number;
    let errorResponse: HttpErrorFormat;

    if (exception instanceof HttpException) {
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
          // 보안상 인증 오류는 고정 메시지 사용
          errorResponse = {
            error: 'UNAUTHORIZED',
            message: '인증 오류가 발생했습니다.',
            description: req.url,
          };
        } else if (httpStatus === 404) {
          // 404는 구체적인 메시지 사용
          errorResponse = {
            error: 'NOT_FOUND',
            message:
              typeof response === 'string'
                ? response
                : '리소스를 찾을 수 없습니다.',
            description: req.url,
          };
        } else {
          // 일반 HTTP 예외는 실제 메시지 사용
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
        // 일반 오류 처리 - 실제 error.message 사용
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

    //! HttpErrorFormat 로 리턴하기 위해 super.catch 없이 직접 응답처리
    res.status(httpStatus).json(errorResponse);
    // super.catch(exception, host);

    //! development 환경의 경우, slack 메시지 보내지 않음.
    if (httpStatus >= 500 && process.env.NODE_ENV !== 'development') {
      // 이 오류에 대한 상세 context 추가
      Sentry.captureException(exception, (scope) => {
        scope.setTag('apiVersion', 'v1');
        scope.setTag('env', process.env.NODE_ENV);

        // 유저 정보
        if (req.user) {
          scope.setUser({
            id: req.user.id,
            email: req.user.email,
          });
        }

        // 요청 관련 정보
        scope.setExtra('method', req.method);
        scope.setExtra('url', req.originalUrl);
        scope.setExtra('query', req.query);
        scope.setExtra('params', req.params);
        scope.setExtra('body', req.body);
        scope.setExtra('headers', req.headers);
        scope.setExtra('errorResponse', errorResponse);

        return scope;
      });
      // 💥 fire and forget) Send Slack notification
      this.notifySlack(exception, errorResponse).catch((e) =>
        console.error('🔴 Slack 전송 실패', e.stack),
      );
    }
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
            text: `*🔴 ${process.env.NODE_ENV} 환경에서 오류 발생*`,
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
