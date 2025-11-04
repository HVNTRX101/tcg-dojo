import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useResetPassword } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const resetPassword = useResetPassword();

  useEffect(() => {
    if (!token) {
      setValidationError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const validateForm = () => {
    if (!password) {
      setValidationError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return false;
    }

    if (!confirmPassword) {
      setValidationError('Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setValidationError('Invalid reset token');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      await resetPassword.mutateAsync({ token, newPassword: password });
      setIsSuccess(true);
      toast.success('Password reset successful!', {
        description: 'You can now sign in with your new password.',
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to reset password. The link may have expired.';
      setValidationError(errorMessage);
      toast.error('Password reset failed', {
        description: errorMessage,
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/signin" className="w-full">
              <Button className="w-full">Sign In with New Password</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>Please request a new password reset link to continue.</p>
            </div>
            <Link to="/forgot-password" className="w-full">
              <Button className="w-full">Request New Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={resetPassword.isPending}
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={resetPassword.isPending}
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Remember your password?{' '}
                <Link to="/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
