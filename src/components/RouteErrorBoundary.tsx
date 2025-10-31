import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.DEV;

  // Determine error type and message
  let errorMessage = 'An unexpected error occurred';
  let errorStatus: number | undefined;
  let errorStatusText: string | undefined;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorStatusText = error.statusText;
    errorMessage = error.data?.message || error.statusText || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Log error for debugging
  console.error('Route error:', error);

  // Handle different error statuses
  const getErrorTitle = () => {
    if (errorStatus === 404) return 'Page Not Found';
    if (errorStatus === 403) return 'Access Denied';
    if (errorStatus === 401) return 'Unauthorized';
    if (errorStatus === 500) return 'Server Error';
    return 'Oops! Something went wrong';
  };

  const getErrorDescription = () => {
    if (errorStatus === 404) {
      return "The page you're looking for doesn't exist or has been moved.";
    }
    if (errorStatus === 403) {
      return "You don't have permission to access this page.";
    }
    if (errorStatus === 401) {
      return 'Please sign in to access this page.';
    }
    if (errorStatus === 500) {
      return 'The server encountered an error. Please try again later.';
    }
    return 'This page encountered an error while loading.';
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8">
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="bg-red-100 dark:bg-red-900 p-4 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Status */}
          {errorStatus && (
            <div className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-2">
              {errorStatus}
            </div>
          )}

          {/* Error Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {getErrorTitle()}
          </h1>

          {/* Error Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            {getErrorDescription()}
          </p>

          {/* Error Details (Development Only) */}
          {isDevelopment && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Error Details (Development Only):
              </p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                {errorMessage}
              </p>
              {error instanceof Error && error.stack && (
                <details className="mt-3">
                  <summary className="text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-60 mt-2">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="default"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
