import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ReactNode } from 'react';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: Array<'USER' | 'SELLER' | 'ADMIN'>;
  redirectTo?: string;
}

/**
 * RequireRole component that checks user role authorization
 * Redirects to sign-in if not authenticated
 * Redirects to unauthorized page if user lacks required role
 */
export function RequireRole({
  children,
  allowedRoles,
  redirectTo = '/unauthorized',
}: RequireRoleProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check if user has required role
  const userRole = user?.role || 'USER';
  const hasRequiredRole = allowedRoles.includes(userRole);

  // Redirect to unauthorized page if user lacks required role
  if (!hasRequiredRole) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User has required role, render children
  return <>{children}</>;
}
