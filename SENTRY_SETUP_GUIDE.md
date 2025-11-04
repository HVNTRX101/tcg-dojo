# Sentry Error Monitoring Setup Guide

This guide walks you through setting up Sentry error monitoring for both the frontend and backend of the TCG Marketplace application.

## What is Sentry?

Sentry is a comprehensive error tracking and performance monitoring platform that helps developers identify, diagnose, and fix issues in real-time. It provides:

- **Real-time error tracking**: Catch errors as they happen in production
- **Performance monitoring**: Track slow requests and identify bottlenecks
- **Session replay**: See what users were doing when errors occurred
- **Release tracking**: Monitor errors across different versions
- **Alert notifications**: Get notified when critical errors occur

## Prerequisites

1. A Sentry account (sign up for free at [https://sentry.io/signup/](https://sentry.io/signup/))
2. A Sentry project for your application

## Step 1: Create a Sentry Project

1. Log in to your Sentry account at [https://sentry.io](https://sentry.io)
2. Click "Projects" in the left sidebar
3. Click "Create Project"
4. Select your platform:
   - For frontend: Select **React**
   - For backend: Select **Node.js** or **Express**
5. Set an alert frequency (recommended: "Alert me on every new issue")
6. Name your project (e.g., "tcg-marketplace-frontend" and "tcg-marketplace-backend")
7. Click "Create Project"

## Step 2: Get Your DSN (Data Source Name)

After creating a project, Sentry will show you a DSN that looks like:
```
https://examplePublicKey@o0.ingest.sentry.io/0
```

You can always find your DSN later by:
1. Going to **Settings** → **Projects**
2. Selecting your project
3. Going to **Client Keys (DSN)**
4. Copying the DSN value

**Important**: You'll need separate DSNs for frontend and backend if you created separate projects.

## Step 3: Configure Backend Sentry

### 3.1 Add DSN to Backend Environment Variables

1. Open `backend/.env` file
2. Find the `SENTRY_DSN` variable (should be at the bottom)
3. Replace the placeholder with your actual backend Sentry DSN:

```env
# Sentry Error Monitoring
SENTRY_DSN=https://your-actual-backend-dsn@sentry.io/your-project-id
```

### 3.2 Backend Configuration (Already Set Up)

The backend is already configured with Sentry! The configuration includes:

- **Location**: [backend/src/config/sentry.ts](backend/src/config/sentry.ts)
- **Integration**: Fully integrated with Express middleware
- **Features**:
  - Request tracking with `sentryRequestHandler()`
  - Performance monitoring with `sentryTracingHandler()`
  - Error capture with `sentryErrorHandler()`
  - Sensitive data filtering (passwords, tokens, etc.)
  - Validation error and 404 filtering
  - User context tracking
  - Breadcrumbs for debugging
  - Transaction tracking for performance monitoring

**Sample Rates** (configured in sentry.ts):
- Development: 100% of errors and traces
- Production: 10% of errors and traces (to manage quota)

### 3.3 Using Backend Sentry Utilities

The backend exports several utility functions from `backend/src/config/sentry.ts`:

```typescript
import {
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setContext,
  startTransaction,
} from './config/sentry';

// Capture an exception
try {
  // your code
} catch (error) {
  captureException(error);
}

// Capture a message
captureMessage('Something important happened', 'info');

// Set user context
setUser(userId, email, username);

// Add breadcrumb
addBreadcrumb('User clicked checkout', 'user-action', 'info', { cart: cartData });

// Start performance transaction
const transaction = startTransaction('process-order', 'function');
// ... do work
transaction.finish();
```

## Step 4: Configure Frontend Sentry

### 4.1 Add DSN to Frontend Environment Variables

1. Open `.env` file (in the root directory)
2. Find the `VITE_SENTRY_DSN` variable (should be at the bottom)
3. Replace the placeholder with your actual frontend Sentry DSN:

```env
# Sentry Error Monitoring
VITE_SENTRY_DSN=https://your-actual-frontend-dsn@sentry.io/your-project-id
```

4. **Enable error reporting** by setting:

```env
VITE_ENABLE_ERROR_REPORTING=true
```

### 4.2 Frontend Configuration (Already Set Up)

The frontend is now configured with Sentry! The configuration includes:

- **Initialization**: [src/main.tsx](src/main.tsx:7-37) - Sentry initialized before React renders
- **Error Logging**: [src/utils/errorLogging.ts](src/utils/errorLogging.ts) - Integrated with existing error boundary system
- **Features**:
  - Browser tracing for performance monitoring
  - Session replay (with privacy settings: masked text and blocked media)
  - Error boundaries at root, route, and component levels
  - API error tracking
  - Uncaught error and promise rejection handling
  - Automatic sanitization of sensitive data

**Sample Rates** (configured in main.tsx):
- Development: 100% of errors, traces, and replays
- Production: 10% of errors, traces, and replays (adjustable)

### 4.3 Using Frontend Sentry Utilities

The frontend exports several utility functions from `src/utils/errorLogging.ts`:

```typescript
import {
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  setTag,
  setContext,
  captureMessage,
  logApiError,
  logComponentError,
} from './utils/errorLogging';

// Set user context after login
setUserContext(user.id, user.email, user.username);

// Clear user context on logout
clearUserContext();

// Add breadcrumb for user actions
addBreadcrumb('User viewed product', 'navigation', 'info', { productId: '123' });

// Log API errors (automatically called by axios interceptor)
logApiError(error, '/api/products', 'GET', {
  statusCode: 500,
  requestData: { query: 'search term' },
  responseData: errorResponse,
});

// Set custom tags
setTag('feature', 'checkout');

// Set custom context
setContext('order', { orderId: '123', total: 99.99 });

// Capture informational message
captureMessage('User completed checkout', 'info');
```

## Step 5: Verify Installation

### 5.1 Test Backend Sentry

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Trigger a test error by accessing a non-existent endpoint or causing an error in your code

3. Check your Sentry dashboard - you should see the error appear within seconds

### 5.2 Test Frontend Sentry

1. Make sure `VITE_ENABLE_ERROR_REPORTING=true` in your `.env` file

2. Start the frontend development server:
```bash
npm run dev
```

3. Open the browser console and deliberately trigger an error:
```javascript
throw new Error('Test Sentry integration');
```

4. Check your Sentry dashboard - you should see the error appear with:
   - Error message and stack trace
   - Browser information
   - User actions (breadcrumbs)
   - Session replay (if enabled)

## Step 6: Production Deployment

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

**Backend** (`.env` or your hosting platform):
```env
SENTRY_DSN=https://your-backend-dsn@sentry.io/your-project-id
NODE_ENV=production
```

**Frontend** (build environment):
```env
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/your-project-id
VITE_ENABLE_ERROR_REPORTING=true
```

### Adjusting Sample Rates for Production

Both frontend and backend are configured with 10% sample rates for production by default. You can adjust these in:

- **Backend**: [backend/src/config/sentry.ts](backend/src/config/sentry.ts) - Modify `tracesSampleRate` and `profilesSampleRate`
- **Frontend**: [src/main.tsx](src/main.tsx) - Modify `tracesSampleRate`, `replaysSessionSampleRate`, and `replaysOnErrorSampleRate`

### Source Maps (Recommended for Production)

To get readable stack traces in production, upload source maps to Sentry:

1. Install Sentry CLI:
```bash
npm install --save-dev @sentry/vite-plugin
```

2. Configure Vite to upload source maps (add to `vite.config.ts`):
```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    // ... other plugins
    sentryVitePlugin({
      org: "your-org-slug",
      project: "your-project-slug",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

3. Set `SENTRY_AUTH_TOKEN` in your build environment

## Best Practices

### 1. User Privacy
- ✅ **Already configured**: Both frontend and backend sanitize sensitive data (passwords, tokens, etc.)
- ✅ **Session replay**: Text is masked and media is blocked by default
- Consider GDPR compliance if serving EU users

### 2. Alert Management
- Set up alert rules in Sentry to notify your team of critical errors
- Use Sentry's integration with Slack, Discord, PagerDuty, etc.
- Configure alert frequency to avoid noise

### 3. Performance Budget
- Monitor your Sentry quota usage (free tier: 5k errors/month, 10k transactions/month)
- Adjust sample rates if you exceed quota
- Use filters to ignore known/non-critical errors

### 4. Error Grouping
- Add meaningful error messages to help Sentry group similar errors
- Use tags and contexts to filter and search errors effectively
- Set up releases to track which version introduced bugs

### 5. Development vs Production
- Consider disabling Sentry in local development to save quota
- Use `VITE_ENABLE_ERROR_REPORTING=false` for local frontend development
- Backend automatically uses different sample rates based on `NODE_ENV`

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN configuration**: Ensure the DSN is correctly set in environment variables
2. **Check error reporting flag**: Frontend requires `VITE_ENABLE_ERROR_REPORTING=true`
3. **Restart servers**: After changing environment variables, restart both frontend and backend
4. **Check network**: Ensure your application can reach `sentry.io` (check firewall/proxy)
5. **Check console**: Look for Sentry initialization errors in browser console or server logs

### Too Many Errors

1. **Adjust sample rates**: Lower the percentages in sentry.ts and main.tsx
2. **Filter errors**: Use `beforeSend` hooks to filter out known issues
3. **Fix recurring errors**: Prioritize fixing errors that occur frequently

### Source Maps Not Working

1. Ensure source maps are generated during build (`sourcemap: true` in vite.config.ts)
2. Upload source maps using Sentry CLI or Vite plugin
3. Check that release names match between deployment and source maps

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)

## Summary

You now have Sentry configured for both frontend and backend! The system will:

- ✅ Capture errors automatically
- ✅ Track performance issues
- ✅ Record user sessions (frontend only)
- ✅ Filter sensitive data
- ✅ Provide detailed debugging context
- ✅ Alert your team of critical issues

**Next Steps:**
1. Replace placeholder DSNs with your actual Sentry project DSNs
2. Set `VITE_ENABLE_ERROR_REPORTING=true` to enable frontend error tracking
3. Test error tracking in development
4. Configure alerts and integrations in your Sentry dashboard
5. Deploy to production with proper environment variables

For questions or issues, refer to the [Sentry documentation](https://docs.sentry.io/) or check the configuration files mentioned in this guide.
