import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useVerifyEmail, useResendVerification } from '../hooks/useAuth';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Mail, Loader2 } from 'lucide-react';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerification();

  useEffect(() => {
    if (token) {
      handleVerification(token);
    } else {
      setVerificationState('error');
      setErrorMessage('Invalid or missing verification token');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleVerification = async (verificationToken: string) => {
    try {
      await verifyEmail.mutateAsync(verificationToken);
      setVerificationState('success');
      toast.success('Email verified successfully!', {
        description: 'You can now access all features of your account.',
      });
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      setVerificationState('error');
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to verify email. The link may have expired.';
      setErrorMessage(errorMsg);
      toast.error('Verification failed', {
        description: errorMsg,
      });
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success('Verification email sent!', {
        description: 'Please check your email inbox for the new verification link.',
      });
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to resend verification email.';
      toast.error('Resend failed', {
        description: errorMsg,
      });
    }
  };

  if (verificationState === 'verifying') {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationState === 'success') {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email address has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>You now have full access to all features of your account.</p>
              <p className="mt-2">Redirecting you to the home page...</p>
            </div>
            <Link to="/" className="w-full">
              <Button className="w-full">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Verification Failed</CardTitle>
          <CardDescription>
            {errorMessage || 'We couldn\'t verify your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            <p>The verification link may have expired or is invalid.</p>
            <p className="mt-2">You can request a new verification email below.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleResendVerification}
              disabled={resendVerification.isPending}
              className="w-full"
            >
              {resendVerification.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
