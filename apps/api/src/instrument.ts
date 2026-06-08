import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Must be imported BEFORE any other modules.
// See: https://docs.sentry.io/platforms/javascript/guides/nestjs/

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  // Sample 10% of transactions in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV ?? 'development',
  // Only initialise when a DSN is set (no-op in local dev without DSN)
  enabled: Boolean(process.env.SENTRY_DSN),
});
