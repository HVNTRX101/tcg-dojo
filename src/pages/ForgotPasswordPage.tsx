import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useRequestPasswordReset } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const requestReset = useRequestPasswordReset();

  const validateEmail = () => {
    if (!email) {
      setValidationError('Email address is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    try {
      await requestReset.mutateAsync(email);
      setIsSuccess(true);
      toast.success('Password reset email sent!', {
        description: 'Check your email for instructions to reset your password.',
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to send password reset email. Please try again.';
      setValidationError(errorMessage);
      toast.error('Request failed', {
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
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>
                If you don't see the email, check your spam folder or request a new link.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => setIsSuccess(false)} variant="outline" className="w-full">
                Try Another Email
              </Button>
              <Link to="/signin" className="w-full">
                <Button className="w-full">Return to Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <Link to="/signin">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you instructions to reset your password.
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
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={requestReset.isPending}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={requestReset.isPending}
            >
              {requestReset.isPending ? 'Sending...' : 'Send Reset Instructions'}
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
