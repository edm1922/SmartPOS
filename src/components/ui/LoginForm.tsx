import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Store, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface LoginFormProps {
  title: string;
  subtitle: string;
  onSubmit: (identifier: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  showBackButton?: boolean;
  identifierLabel?: string;
  identifierPlaceholder?: string;
  identifierType?: string;
  showForgotPasswordLink?: boolean;
  icon?: React.ReactNode;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  title,
  subtitle,
  onSubmit,
  loading,
  error,
  showBackButton = true,
  identifierLabel = 'Username',
  identifierPlaceholder = 'Enter your username',
  identifierType = 'text',
  showForgotPasswordLink = false,
  icon,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof onSubmit !== 'function') {
      console.error('onSubmit is not a function:', onSubmit);
      return;
    }

    try {
      await onSubmit(identifier, password);
      setIdentifier('');
      setPassword('');
    } catch (err) {
      console.error('Error in handleSubmit:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-primary selection:text-primary-foreground">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-primary text-primary-foreground w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm">
            {icon || <Store className="h-7 w-7" />}
          </div>
        </div>
        <div className="mt-4 text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-sm border border-border bg-card">
          <CardContent className="py-8 px-4 sm:px-8 space-y-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-destructive">Authentication Error</p>
                    <p className="text-destructive/90 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {identifierLabel}
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type={identifierType}
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  placeholder={identifierPlaceholder}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  {showForgotPasswordLink && (
                    <Link
                      href="/auth/admin/forgot-password"
                      className="text-xs font-medium text-primary hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-semibold h-11 gap-2"
                  variant="default"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </div>
            </form>

            {showBackButton && (
              <div className="pt-2 border-t border-border">
                <Link href="/" className="w-full block">
                  <Button variant="outline" className="w-full font-semibold gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AJ Softdrive Store. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};