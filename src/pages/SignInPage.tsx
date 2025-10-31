import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication logic
    // Handle sign in without logging sensitive data
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar with Illustration */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-blue-500 to-purple-600 p-12 items-center justify-center">
        <div className="text-white text-center">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1631083354486-01e4f4a7d1d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmVhc3VyZSUyMHZhdWx0JTIwa2V5JTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc2MDYwMDA4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Treasure vault"
            className="w-full max-w-md mx-auto mb-8 rounded-lg"
            lazy={false}
          />
          <h2 className="text-2xl mb-4">Welcome Back!</h2>
          <p className="text-blue-100">Sign in to access your collection, track your cards, and discover new treasures.</p>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl mb-2">Sign In</h1>
            <p className="text-gray-600 mb-8">Welcome back! Please sign in to your account.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <a href="#" className="text-blue-600 hover:underline">
                  Forgot Password?
                </a>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>

              <div className="text-center text-gray-500">
                <p className="text-xs">
                  This site is protected by hCaptcha and its{' '}
                  <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> and{' '}
                  <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> apply.
                </p>
              </div>
            </form>
          </div>

          <p className="text-center mt-6 text-gray-600">
            Don't have an account yet?{' '}
            <a href="#" className="text-blue-600 hover:underline">Start one now</a>
          </p>
        </div>
      </div>
    </div>
  );
}
