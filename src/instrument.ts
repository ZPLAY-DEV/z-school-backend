import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Ensure to call this before requiring any other modules!
const nodeEnv = process.env.NODE_ENV ?? 'dev';

// 환경별 Sentry 설정
const getSentryConfig = () => {
  switch (nodeEnv) {
    case 'prod':
      // 프로덕션: 10% 샘플링 (비용 효율적 모니터링)
      return {
        environment: 'prod',
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        enableProfiling: true,
        sendDefaultPii: true,
      };

    case 'qa':
      // QA: Sentry 완전 비활성화 (순수 성능 측정)
      return {
        environment: 'qa',
        tracesSampleRate: 0,
        profilesSampleRate: 0,
        enableProfiling: false,
        sendDefaultPii: false,
      };

    case 'dev':
    default:
      // 개발: 100% 모니터링 (모든 것 추적)
      return {
        environment: 'dev',
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        enableProfiling: true,
        sendDefaultPii: true,
      };
  }
};

const config = getSentryConfig();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: config.environment,
  integrations: [
    // Add our Profiling integration
    ...(config.enableProfiling ? [nodeProfilingIntegration()] : []),
  ],

  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: config.sendDefaultPii,

  // Add Tracing by setting tracesSampleRate
  tracesSampleRate: config.tracesSampleRate,

  // Set sampling rate for profiling
  // This is relative to tracesSampleRate
  profilesSampleRate: config.profilesSampleRate,
});
