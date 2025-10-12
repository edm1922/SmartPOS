'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { LoginForm } from '@/components/redesigned/LoginForm';

export default function CashierLoginRedesigned() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabaseAuth.signInWithEmail(email, password);

      if (error) throw new Error(error);

      // Check if user is cashier
      const { data: userData, error: userError } = await supabaseDB.getUserRole(data?.user?.id || '');

      if (userError) throw new Error(userError);

      if (userData?.role !== 'cashier') {
        // Sign out if not cashier
        await supabaseAuth.signOut();
        throw new Error('Access denied. Cashier access required.');
      }

      router.push('/cashier/pos');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginForm
      title="Cashier Login"
      subtitle="Sign in to access the POS terminal"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
}