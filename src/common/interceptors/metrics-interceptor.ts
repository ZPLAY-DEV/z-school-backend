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
  private readonly isMetricsEnabled: boolean;

  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,

    @InjectMetric('http_response_status_total')
    private readonly statusCodeCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,

    @InjectMetric('exceptions_total')
    private readonly exceptionsCounter: Counter<string>,
  ) {
    // 환경변수로 메트릭 활성화 여부 확인 (추가 안전장치)
    this.isMetricsEnabled = process.env.PROMETHEUS_METRICS === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 메트릭이 비활성화된 경우 수집하지 않음
    if (!this.isMetricsEnabled) {
      return next.handle();
    }

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
