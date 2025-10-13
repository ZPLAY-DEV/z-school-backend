// MetricsInterceptor.ts

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable, tap } from 'rxjs';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,

    @InjectMetric('http_response_status_total')
    private readonly statusCodeCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,

    @InjectMetric('exceptions_total')
    private readonly exceptionsCounter: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.route?.path || request.url;

    if (url.startsWith('/metrics')) {
      return next.handle();
    }

    const endTimer = this.requestDuration.startTimer({ method, url });

    this.requestCounter.inc({ method, url });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          this.statusCodeCounter.inc({ statusCode });
          endTimer(); // 정상 종료
        },
        error: () => {
          this.exceptionsCounter.inc({ method, url });
          endTimer();
        },
      }),
    );
  }
}
