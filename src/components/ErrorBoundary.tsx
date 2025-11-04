import { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { logComponentError } from '../utils/errorLogging';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'root' | 'route' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to centralized error logging service
    logComponentError(error, errorInfo, this.props.level);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReset = () => {
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    this.resetErrorBoundary();
    window.location.href = '/';
  };

  renderDefaultFallback() {
    const { error, errorInfo } = this.state;
    const { level = 'root' } = this.props;
    const isDevelopment = import.meta.env.DEV;

    // Different UI based on error boundary level
    if (level === 'route' || level === 'component') {
      return (
        <div className="w-full p-6">
          <Card className="max-w-3xl mx-auto p-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {level === 'route' ? 'Page Error' : 'Component Error'}
                </h2>

                <p className="text-gray-700 mb-4">
                  {level === 'route'
                    ? 'This page encountered an error while loading. Please try refreshing or return to the homepage.'
                    : 'This section encountered an error. The rest of the page should work normally.'}
                </p>

                {error && isDevelopment && (
                  <div className="bg-white border border-red-300 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">
                      Error Details (Development Only):
                    </p>
                    <p className="text-sm font-mono text-gray-800 mb-2">{error.toString()}</p>
                    {error.stack && (
                      <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo && errorInfo.componentStack && (
                      <details className="mt-2">
                        <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
                          Component Stack
                        </summary>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-40 mt-1">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="default"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  {level === 'route' && (
                    <Button onClick={this.handleGoHome} variant="outline" size="sm">
                      <Home className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Root-level error (full page takeover)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Oops! Something went wrong
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We encountered an unexpected error. Don&apos;t worry, we&apos;ve logged this issue and
            will look into it.
          </p>

          {error && (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Error Message:
              </p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{error.message}</p>
              {isDevelopment && error.stack && (
                <details className="mt-3">
                  <summary className="text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-60 mt-2">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button onClick={this.handleGoHome} className="bg-blue-600 hover:bg-blue-700">
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Otherwise use default fallback
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }
}
