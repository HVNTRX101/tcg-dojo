import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component that requires authentication
 * Redirects to sign-in page if user is not authenticated
 * Preserves the intended destination for redirect after login
 */
export function ProtectedRoute({ children, redirectTo = '/signin' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
