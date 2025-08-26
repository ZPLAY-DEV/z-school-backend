import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // integrations: [nodeProfilingIntegration()],
  // tracesSampleRate: process.env.NODE_ENV === 'local' ? 0.2 : 0.0,
  // profilesSampleRate: process.env.NODE_ENV === 'local' ? 0.2 : 0.0,
  // debug: process.env.SENTRY_LOG_LEVEL === 'debug',
  sendDefaultPii: true,
});
