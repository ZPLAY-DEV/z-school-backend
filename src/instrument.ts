import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'local' ? 1.0 : 0.0, // local 만 fully enable
  debug: process.env.SENTRY_LOG_LEVEL === 'debug',
});
