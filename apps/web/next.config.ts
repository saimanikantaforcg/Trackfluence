import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from '@ducanh2912/next-pwa';
import path from 'path';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  transpilePackages: ['@trackfluence/shared'],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Fix pnpm monorepo workspace root detection
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default withSentryConfig(withPWA(nextConfig), {
  // Sentry organisation & project (set in CI env or .env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps when a Sentry auth token is present (CI)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silent in local dev to avoid noise
  silent: process.env.NODE_ENV !== 'production',

  // Automatically tree-shake Sentry debug logs in production
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // Tunnel Sentry requests through Next.js to avoid ad blockers
  tunnelRoute: '/monitoring',

  // Hide source maps from the browser bundle
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
});
