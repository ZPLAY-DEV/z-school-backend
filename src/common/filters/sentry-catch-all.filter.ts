import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { SlackService } from 'src/services/slack/slack-service';
@Catch()
export class SentryCatchAllFilter extends BaseExceptionFilter {
  constructor(private readonly slack: SlackService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (httpStatus >= 500 && process.env.NODE_ENV !== 'local') {
      Sentry.captureException(exception);
      this.notifySlack(exception as any);
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

    await this.slack.sendMessage({
      channel: 'error',
      text: `[${process.env.NODE_ENV}환경] 🆘 500 오류`,
      attachments: [
        {
          color: 'danger',
          text: `오류정보`,
          fields: [
            { title: `Query`, value: query, short: false },
            { title: `Params`, value: params, short: false },
            { title: `Message`, value: message, short: true },
          ],
        },
      ],
    });
  }
}
