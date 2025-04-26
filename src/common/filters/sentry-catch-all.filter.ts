import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';
import { KnownBlock } from '@slack/types';
import { SlackService } from 'src/services/slack/slack-service';

// todo. Sentry DSN 를 v3 용으로 Sentry 콘솔에서 발급하고 변경이 필요. (무료 사용중?)
@Catch()
export class SentryCatchAllFilter extends BaseExceptionFilter {
  constructor(private readonly slack: SlackService) {
    super();
  }

  @SentryExceptionCaptured() // Sentry 대쉬보드에 오류정보 추가
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    //! local 환경의 경우, slack 메시지 보내지 않도록 했으니깐 참고!
    if (httpStatus >= 500 && process.env.NODE_ENV !== 'local') {
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

        return scope;
      });
      // 💥 fire and forget. to not block the main thread
      this.notifySlack(exception).catch((e) =>
        console.error('🔴 Slack 전송 실패', e.stack),
      );
    }

    super.catch(exception, host);
  }

  async notifySlack(exception: unknown) {
    let query = 'n/a';
    let params = 'n/a';
    let message = 'Unknown error';

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        query = (response as any)?.query ?? 'n/a';
        params = (response as any)?.parameters?.join(',') ?? 'n/a';
      }
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const payload = {
      channel: 'error',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🔴 ${process.env.NODE_ENV} 환경에서 500 오류 발생*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Query:*\n${query}`,
            },
            {
              type: 'mrkdwn',
              text: `*Params:*\n${params}`,
            },
            {
              type: 'mrkdwn',
              text: `*Message:*\n${message}`,
            },
          ],
        },
      ] as KnownBlock[],
    };
    await this.slack.sendMessage(payload);
  }
}
