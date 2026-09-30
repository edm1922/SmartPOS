'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabaseAuth } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabaseAuth.resetPasswordForEmail(email);
      if (error) throw new Error(error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending the reset email');
    } finally {
      setLoading(false);
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
            <KeyRound className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-4 text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Forgot Password?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Enter your admin email and we'll send a password reset link.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-sm border border-border bg-card">
          <CardContent className="py-8 px-4 sm:px-8 space-y-6">
            {success ? (
              <div className="text-center space-y-4 py-2">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">Reset Link Sent</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Check your inbox at <span className="font-semibold text-foreground">{email}</span> for instructions to reset your password.
                  </p>
                </div>
                <div className="pt-4 border-t border-border">
                  <Link href="/auth/admin/login" className="w-full block">
                    <Button variant="default" className="w-full font-semibold h-11">
                      Back to Admin Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm">
                      <p className="font-semibold text-destructive">Error</p>
                      <p className="text-destructive/90 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="admin@example.com"
                  />
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
                        Sending link...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </div>

                <div className="pt-2 border-t border-border">
                  <Link href="/auth/admin/login" className="w-full block">
                    <Button variant="outline" className="w-full font-semibold gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Return to Admin Login
                    </Button>
                  </Link>
                </div>
              </form>
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
}
