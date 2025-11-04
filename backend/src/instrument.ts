/**
 * Sentry Instrumentation
 *
 * IMPORTANT: This file must be imported at the very top of your entry point (server.ts)
 * before any other imports. This ensures Sentry can capture all errors and performance data.
 *
 * Usage in server.ts:
 * import './instrument';  // Must be first!
 * import express from 'express';
 * // ... other imports
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Setting this option to true will send default PII data to Sentry
    // For example, automatic IP address collection on events
    sendDefaultPii: true,

    // Send structured logs to Sentry
    enableLogs: true,

    integrations: [
      // Enable HTTP calls tracing (enabled by default in v8+)
      Sentry.httpIntegration(),
      // Capture console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
      // Performance profiling
      nodeProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // Adjust in production to manage quota
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set sampling rate for profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Release version
    release: process.env.APP_VERSION || 'unknown',

    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint.originalException as Error;

      // Don't send validation errors to Sentry
      if (error?.message?.includes('Validation Error')) {
        return null;
      }

      // Don't send 404 errors
      if (event.exception?.values?.[0]?.value?.includes('404')) {
        return null;
      }

      return event;
    },

    // Filter breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't log breadcrumbs with sensitive data
      if (breadcrumb.category === 'console' && breadcrumb.message?.includes('password')) {
        return null;
      }

      return breadcrumb;
    },
  });

  console.log('✅ Sentry error tracking initialized');
} else {
  console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
}
