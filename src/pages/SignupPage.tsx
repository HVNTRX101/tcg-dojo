import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useSignup } from '../hooks/useAuth';

export default function SignupPage() {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await signupMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      toast.success('Account created successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex-1" />
            </div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <p className="text-muted-foreground">Join our TCG marketplace community</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={e => handleInputChange('firstName', e.target.value)}
                      className={`pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={e => handleInputChange('lastName', e.target.value)}
                      className={`pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={e => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
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
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={e => handleInputChange('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms and Newsletter */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={checked =>
                      handleInputChange('agreeToTerms', checked as boolean)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-500">{errors.agreeToTerms}</p>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newsletter"
                    checked={formData.newsletter}
                    onCheckedChange={checked => handleInputChange('newsletter', checked as boolean)}
                  />
                  <Label htmlFor="newsletter" className="text-sm">
                    Subscribe to our newsletter for updates and special offers
                  </Label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <Separator />

              {/* Sign In Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/signin" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
