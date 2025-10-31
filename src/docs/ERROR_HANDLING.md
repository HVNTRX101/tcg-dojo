# Error Handling System

This document describes the comprehensive error handling system implemented in the application.

## Overview

The error handling system provides multiple layers of error catching and logging:

1. **Global Error Handlers** - Catch uncaught errors and unhandled promise rejections
2. **Root-Level Error Boundary** - Wraps the entire application
3. **Route-Level Error Boundaries** - Catch errors in specific routes
4. **Component-Level Error Boundaries** - Catch errors in specific components
5. **API Error Handling** - Centralized handling of API errors
6. **Error Logging Service** - Centralized logging for all errors

## Architecture

### Error Boundary Hierarchy

```
App (Root Error Boundary)
  └── Router
      ├── Layout
      │   └── Route Error Boundary (React Router)
      │       └── LazyRoute (Route-Level Error Boundary)
      │           └── Page Component
      │               └── Component Error Boundary (optional)
      │                   └── Child Components
```

## Components

### 1. ErrorBoundary Component

Located in: [src/components/ErrorBoundary.tsx](../components/ErrorBoundary.tsx)

A flexible React error boundary component that can be used at multiple levels.

**Props:**
- `children: ReactNode` - The components to wrap
- `fallback?: (error: Error, reset: () => void) => ReactNode` - Custom fallback UI
- `onError?: (error: Error, errorInfo: React.ErrorInfo) => void` - Custom error handler
- `resetKeys?: Array<string | number>` - Keys that trigger error boundary reset when changed
- `level?: 'root' | 'route' | 'component'` - Error boundary level (affects UI display)

**Usage:**

```tsx
// Root level
<ErrorBoundary level="root">
  <App />
</ErrorBoundary>

// Route level
<ErrorBoundary level="route">
  <ProductPage />
</ErrorBoundary>

// Component level with custom fallback
<ErrorBoundary
  level="component"
  fallback={(error, reset) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
>
  <ComplexComponent />
</ErrorBoundary>
```

### 2. RouteErrorBoundary Component

Located in: [src/components/RouteErrorBoundary.tsx](../components/RouteErrorBoundary.tsx)

A specialized error boundary for React Router that handles routing errors (404, 403, etc.).

**Features:**
- Displays appropriate error messages based on HTTP status codes
- Shows different UI for 404, 403, 401, 500 errors
- Provides navigation options (Go Back, Go Home, Refresh)
- Shows detailed error information in development mode

**Usage:**

```tsx
// In router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [...]
  }
]);
```

## Error Logging

### Error Logging Utility

Located in: [src/utils/errorLogging.ts](../utils/errorLogging.ts)

Provides centralized error logging functionality.

**Functions:**

#### `logErrorToService(errorData: ErrorLogData)`

Logs errors to an external error tracking service (e.g., Sentry, LogRocket).

```typescript
interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  level: 'root' | 'route' | 'component' | 'api';
  userId?: string;
  metadata?: Record<string, any>;
}
```

#### `logApiError(error, endpoint, method, options?)`

Specialized logging for API errors with request/response context.

```typescript
logApiError(
  new Error('Failed to fetch products'),
  '/api/products',
  'GET',
  {
    statusCode: 500,
    responseData: { message: 'Server error' }
  }
);
```

#### `logComponentError(error, errorInfo, componentName?)`

Logs component-level errors with React error info.

```typescript
logComponentError(
  error,
  errorInfo,
  'ProductCard'
);
```

#### `setupGlobalErrorHandlers()`

Sets up global error handlers for uncaught errors and unhandled promise rejections. Called once in [src/main.tsx](../main.tsx).

#### `sanitizeErrorData(data)`

Removes sensitive information (passwords, tokens, etc.) from error data before logging.

### Integrating External Error Tracking

To integrate with services like Sentry:

1. Install the SDK:
```bash
npm install @sentry/react
```

2. Update `src/utils/errorLogging.ts`:
```typescript
import * as Sentry from '@sentry/react';

export function logErrorToService(errorData: ErrorLogData): void {
  if (import.meta.env.PROD) {
    Sentry.captureException(new Error(errorData.message), {
      level: 'error',
      tags: { errorLevel: errorData.level },
      extra: errorData,
    });
  }
}
```

3. Initialize Sentry in `src/main.tsx`:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

## API Error Handling

API errors are handled in the axios interceptor in [src/services/api.ts](../services/api.ts).

**Features:**
- Automatically logs all API errors with request/response context
- Sanitizes sensitive data before logging
- Handles 401 errors by redirecting to sign-in page
- Provides consistent error format

**Error Format:**
```typescript
interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
```

## Error Display Modes

### Development Mode

In development (`import.meta.env.DEV`), error boundaries show:
- Full error message
- Stack trace
- Component stack (for React errors)
- Request/response data (for API errors)

### Production Mode

In production (`import.meta.env.PROD`), error boundaries show:
- User-friendly error message
- Error code/status (if applicable)
- Recovery options (refresh, go home, etc.)
- No sensitive technical details

## Best Practices

### 1. Choose the Right Error Boundary Level

- **Root level**: For critical errors that should take over the entire app
- **Route level**: For page-specific errors that shouldn't crash the entire app
- **Component level**: For isolated component errors (shopping cart, product list, etc.)

### 2. Provide Recovery Options

Always give users a way to recover from errors:
- Refresh/retry button
- Navigation back to safe pages (home, previous page)
- Clear explanation of what went wrong

### 3. Log Errors Appropriately

- Use the appropriate logging function (`logApiError`, `logComponentError`, etc.)
- Include relevant context in metadata
- Sanitize sensitive data before logging

### 4. Handle Different Error Types

```tsx
// API errors - handled automatically
const data = await apiClient.get('/products'); // Errors logged automatically

// Component errors - use error boundary
<ErrorBoundary level="component">
  <ProductList />
</ErrorBoundary>

// Async errors in components - catch and handle
try {
  await someAsyncOperation();
} catch (error) {
  logComponentError(error, { componentStack: '' }, 'MyComponent');
  // Show user-friendly error message
}
```

### 5. Test Error Scenarios

Create test components to verify error boundaries work:

```tsx
// Test component that throws an error
function ErrorTest() {
  throw new Error('Test error');
  return <div>This won't render</div>;
}

// Use in development to test error boundaries
<ErrorBoundary level="component">
  <ErrorTest />
</ErrorBoundary>
```

## Environment Variables

Configure error tracking in `.env`:

```bash
# Enable error logging in development
VITE_ENABLE_ERROR_LOGGING=false

# Sentry DSN (if using Sentry)
VITE_SENTRY_DSN=your-sentry-dsn

# API configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000
```

## Monitoring and Alerts

For production applications, consider:

1. **Error Tracking Services**: Sentry, LogRocket, Datadog
2. **Performance Monitoring**: Track error rates and patterns
3. **User Session Replay**: Understand the context of errors
4. **Alerts**: Set up notifications for critical errors
5. **Error Budgets**: Define acceptable error rates

## Common Error Scenarios

### 1. Network Errors

Handled automatically by API interceptor:
- Network timeout
- Server unavailable
- CORS errors

### 2. Authentication Errors

- 401: Automatically redirects to sign-in
- 403: Shows access denied message

### 3. Not Found Errors

- 404: Shows "Page Not Found" message with navigation options

### 4. Component Render Errors

- Caught by error boundaries
- Shows error message with recovery options
- Logs error with component stack

### 5. Unhandled Promise Rejections

- Caught by global error handler
- Logged with context
- Can be shown to user via error boundary

## Future Enhancements

- [ ] Implement retry logic for transient errors
- [ ] Add error recovery suggestions based on error type
- [ ] Implement offline mode detection
- [ ] Add error analytics dashboard
- [ ] Implement automatic error reporting to backend
- [ ] Add user feedback mechanism for errors
- [ ] Implement circuit breaker pattern for failing APIs
