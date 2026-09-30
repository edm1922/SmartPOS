'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase, supabaseAuth } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const sessionReadyRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const handleRecovery = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && !cancelled) {
            sessionReadyRef.current = true;
            setSessionReady(true);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }

        if (hashAccessToken && hashRefreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (!error && !cancelled) {
            sessionReadyRef.current = true;
            setSessionReady(true);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && !cancelled) {
          sessionReadyRef.current = true;
          setSessionReady(true);
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session && !cancelled) {
              sessionReadyRef.current = true;
              setSessionReady(true);
            }
          }
        );

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      } catch (err) {
        if (!cancelled) {
          setPageError('An unexpected error occurred. Please try the link again.');
        }
      }
    };

    handleRecovery();

    const timeout = setTimeout(() => {
      if (!sessionReadyRef.current && !cancelled) {
        setPageError('Failed to establish recovery session. Please try the link from your email again.');
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseAuth.updatePassword(password);
      if (error) throw new Error(error);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/admin/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your password');
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
            Set New Password
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Please enter your new password below.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-sm border border-border bg-card">
          <CardContent className="py-8 px-4 sm:px-8 space-y-6">
            {success ? (
              <div className="text-center space-y-3 py-2">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">Password Updated</h3>
                <p className="text-xs text-muted-foreground">
                  Your password has been successfully reset. Redirecting you to login...
                </p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {!sessionReady && !pageError && (
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3.5 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                    <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                      Verifying recovery link...
                    </p>
                  </div>
                )}

                {pageError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-destructive">{pageError}</p>
                  </div>
                )}

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
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading || !sessionReady}
                    className="w-full font-semibold h-11 gap-2"
                    variant="default"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      'Update password'
                    )}
                  </Button>
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
