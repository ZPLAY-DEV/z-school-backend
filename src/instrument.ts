import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'local' ? 1.0 : 0.0,
  profilesSampleRate: process.env.NODE_ENV === 'local' ? 1.0 : 0.0,
  debug: process.env.SENTRY_LOG_LEVEL === 'debug',
});
