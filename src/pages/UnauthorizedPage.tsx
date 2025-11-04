import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * UnauthorizedPage - 403 Forbidden
 * Displayed when user tries to access a resource they don't have permission for
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {user ? (
              <>
                <p className="mb-2">
                  You are signed in as <strong>{user.email}</strong>
                </p>
                <p>
                  Your current role: <strong>{user.role || 'USER'}</strong>
                </p>
                <p className="mt-4">
                  The page you're trying to access requires different permissions.
                </p>
              </>
            ) : (
              <p>Please sign in with an account that has the appropriate permissions.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              Go Back
            </Button>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
            {!user && (
              <Button onClick={() => navigate('/signin', { state: { from } })} className="w-full">
                Sign In
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Error Code: 403 Forbidden</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
