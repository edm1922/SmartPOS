'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

        console.error('Recovery URL debug:', {
          hasCode: !!code,
          hasHashAccessToken: !!hashAccessToken,
          hasHashRefreshToken: !!hashRefreshToken,
          pathname: window.location.pathname,
          fullUrl: window.location.href,
        });

        if (code) {
          console.error('Attempting exchangeCodeForSession');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.error('exchangeCodeForSession result:', { data: !!data, error });
          if (!error && !cancelled) {
            sessionReadyRef.current = true;
            setSessionReady(true);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }

        if (hashAccessToken && hashRefreshToken) {
          console.error('Attempting setSession with hash tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          console.error('setSession result:', { data: !!data, error });
          if (!error && !cancelled) {
            sessionReadyRef.current = true;
            setSessionReady(true);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }

        console.error('Checking existing session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.error('getSession result:', { hasSession: !!session, error: sessionError });
        if (session && !cancelled) {
          sessionReadyRef.current = true;
          setSessionReady(true);
          return;
        }

        console.error('Listening for auth state change');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.error('Auth state change event:', event, { hasSession: !!session });
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
        console.error('Recovery handler error:', err);
        if (!cancelled) {
          setPageError('An unexpected error occurred. Please try the link again.');
        }
      }
    };

    handleRecovery();

    const timeout = setTimeout(() => {
      if (!sessionReadyRef.current && !cancelled) {
        console.error('Recovery session timeout');
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
      // Wait a bit then redirect to login
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Please enter your new password below.
          </p>
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-xl bg-white dark:bg-gray-800">
          <CardContent className="py-8 px-4 sm:px-10">
            {success ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">Password Updated</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Your password has been successfully reset. Redirecting you to login...
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {!sessionReady && !pageError && (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">Verifying recovery link...</p>
                      </div>
                    </div>
                  </div>
                )}
                {pageError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">{pageError}</p>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-200"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-200"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={loading || !sessionReady}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Updating password...' : 'Update password'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
