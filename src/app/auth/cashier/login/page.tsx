'use client';

import * as bcrypt from 'bcryptjs';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LoginForm } from '@/components/ui/LoginForm';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function CashierLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (identifier: string, password: string) => {
    console.log('=== CASHIER LOGIN PROCESS STARTED ===');
    console.log('Identifier (username):', identifier);
    console.log('Password: [HIDDEN]');

    setLoading(true);
    setError('');

    try {
      console.log('Attempting to authenticate cashier');

      // First, authenticate against the cashiers table
      const { data: cashierData, error: cashierError } = await supabase
        .from('cashiers')
        .select('id, username, password')
        .eq('username', identifier)
        .is('deleted_at', null)
        .is('is_active', true)
        .single();

      if (cashierError) {
        console.error('Database error when fetching cashier:', cashierError);
        console.error('Error details:', {
          message: cashierError.message,
          code: cashierError.code,
          hint: cashierError.hint,
          details: cashierError.details
        });
        throw new Error('Invalid username or password');
      }

      if (!cashierData) {
        console.log('Cashier not found with username:', identifier);
        throw new Error('Invalid username or password');
      }

      // Verify password using bcrypt
      const isPasswordCorrect = await bcrypt.compare(password, cashierData.password);

      if (!isPasswordCorrect) {
        console.log('Password mismatch for user:', identifier);
        throw new Error('Invalid username or password');
      }

      console.log('Cashier authenticated successfully');

      // Store cashier info in session storage for the POS terminal to use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cashier_id', cashierData.id);
        sessionStorage.setItem('cashier_username', cashierData.username);
        // Set the custom session marker in both localStorage and as a cookie
        localStorage.setItem('cashier_session', 'true');
        document.cookie = 'cashier_session=true; path=/; max-age=86400'; // 24 hours
      }

      console.log('Redirecting to cashier POS');
      // Reset loading state before navigation
      setLoading(false);

      // Force a navigation using window.location for more reliable redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/cashier/pos';
      }
    } catch (error: any) {
      console.error('Login error:', error); // Log the actual error for debugging
      console.log('=== CASHIER LOGIN PROCESS FAILED ===');
      setError(error.message || 'An unexpected error occurred');
      setLoading(false); // Reset loading state on error
    }

    console.log('=== CASHIER LOGIN PROCESS COMPLETED ===');
  };

  return (
    <LoginForm
      title="Cashier Login"
      subtitle="Sign in with username to access the POS terminal"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      showBackButton={true}
    />
  );
}