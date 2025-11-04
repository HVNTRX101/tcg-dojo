import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * SentryTestButton - A component for testing Sentry error tracking
 *
 * This button intentionally throws an error to verify that Sentry
 * is properly configured and capturing exceptions.
 *
 * Only visible in development mode.
 */
export function SentryTestButton() {
  // Only render in development
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  const handleTestError = () => {
    // Confirm before throwing error
    const confirmed = window.confirm(
      'This will throw a test error to verify Sentry integration. Continue?'
    );

    if (confirmed) {
      throw new Error('This is your first error!');
    }
  };

  return (
    <div className="p-4 border border-yellow-500 rounded-lg bg-yellow-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-1">Sentry Error Tracking Test</h3>
          <p className="text-sm text-yellow-800 mb-3">
            Click the button below to throw a test error and verify that Sentry is properly
            capturing exceptions. Check your Sentry dashboard after clicking.
          </p>
          <Button
            onClick={handleTestError}
            variant="destructive"
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Break the world
          </Button>
        </div>
      </div>
      <div className="mt-3 text-xs text-yellow-700">
        <strong>Note:</strong> This button only appears in development mode.
      </div>
    </div>
  );
}
