// metrics.module.ts
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './common/interceptors/metrics-interceptor';

const metricsProviders = [
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'url'],
  }),
  makeCounterProvider({
    name: 'http_response_status_total',
    help: 'Total number of HTTP responses by status code',
    labelNames: ['statusCode'],
  }),
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'url'],
  }),
  makeCounterProvider({
    name: 'exceptions_total',
    help: 'Total number of exceptions',
    labelNames: ['method', 'url'],
  }),
];

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        // 기타 설정 (collect CPU, memory 등)
      },
      path: '/metrics', // 이 경로로 메트릭 노출
      // namePrefix: 'myapp_', 등 프리픽스 옵션 가능
    }),
  ],
  providers: [...metricsProviders, MetricsInterceptor],
  exports: [PrometheusModule, ...metricsProviders, MetricsInterceptor],
})
export class MetricsModule {}
