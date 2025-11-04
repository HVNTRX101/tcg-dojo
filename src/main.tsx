import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './router.tsx';
import './index.css';
import { setupGlobalErrorHandlers } from './utils/errorLogging';

// Initialize Sentry error monitoring
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Setting this option to true will send default PII data to Sentry
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Additional configuration
    beforeSend(event, hint) {
      // Filter out non-critical errors if needed
      if (event.exception) {
        const error = hint.originalException;
        // Don't send validation errors
        if (error instanceof Error && error.message.includes('validation')) {
          return null;
        }
      }
      return event;
    },
  });
}

// Initialize global error handlers
setupGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(<App />);
