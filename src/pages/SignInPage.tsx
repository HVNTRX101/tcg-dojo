import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../components/ui/alert';
import { errorMessageFromUnknown } from '../utils/errorMessage';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  // Get the page user tried to access before being redirected to signin
  const locationState = location.state as { from?: { pathname: string } } | null | undefined;
  const from = locationState?.from?.pathname ?? '/';

  const validateForm = () => {
    if (!email || !password) {
      setValidationError('Email and password are required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      toast.success('Welcome back!', {
        description: 'You have successfully signed in.',
      });
      // Redirect to the page they tried to access, or home
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const errorMessage = errorMessageFromUnknown(
        error,
        'Invalid email or password. Please try again.'
      );
      setValidationError(errorMessage);
      toast.error('Sign in failed', {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar with Illustration */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-blue-500 to-purple-600 p-12 items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto">
          <div className="flex justify-center mb-8">
            <div className="rounded-2xl bg-white/15 p-10 backdrop-blur-sm border border-white/20">
              <Sparkles className="w-24 h-24 text-white/90 mx-auto" aria-hidden />
            </div>
          </div>
          <h2 className="text-2xl mb-4">Welcome Back!</h2>
          <p className="text-blue-100">
            Sign in to access your collection, track your cards, and discover new treasures.
          </p>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-background">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-card rounded-lg shadow-lg p-8">
            <h1 className="text-3xl mb-2">Sign In</h1>
            <p className="text-gray-600 dark:text-muted-foreground mb-8">
              Welcome back! Please sign in to your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email" className="text-gray-900 dark:text-gray-100 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={login.isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-900 dark:text-gray-100 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={login.isPending}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <Link to="/forgot-password" className="text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={login.isPending}
              >
                {login.isPending ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-gray-500">
                <p className="text-xs">
                  This site is protected by hCaptcha and its{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  apply.
                </p>
              </div>
            </form>
          </div>

          <p className="text-center mt-6 text-gray-600">
            Don&apos;t have an account yet?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Start one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
