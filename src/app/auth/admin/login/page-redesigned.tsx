'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { LoginForm } from '@/components/redesigned/LoginForm';

export default function AdminLoginRedesigned() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabaseAuth.signInWithEmail(email, password);

      if (error) throw new Error(error);

      // Check if user is admin
      const { data: userData, error: userError } = await supabaseDB.getUserRole(data?.user?.id || '');

      if (userError) throw new Error(userError);

      if (userData?.role !== 'admin') {
        // Sign out if not admin
        await supabaseAuth.signOut();
        throw new Error('Access denied. Admin access required.');
      }

      router.push('/admin/dashboard');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginForm
      title="Admin Login"
      subtitle="Sign in to access the admin dashboard"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
}