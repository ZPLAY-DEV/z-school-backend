import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.NODE_ENV === 'production'
      ? 'prod'
      : (process.env.NODE_ENV ?? 'dev'),
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Add Tracing by setting tracesSampleRate
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Set sampling rate for profiling
  // This is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});
