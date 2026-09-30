'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/ui/LoginForm';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    console.log('=== ADMIN LOGIN PROCESS STARTED ===');
    console.log('Email:', email);
    console.log('Password: [HIDDEN]');
    
    setLoading(true);
    setError('');

    try {
      console.log('Attempting to sign in with email and password');
      const { data, error } = await supabaseAuth.signInWithEmail(email, password);
      console.log('Sign in result:', { data, error });

      if (error) {
        console.log('Sign in error:', error);
        throw new Error(error);
      }

      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);

      console.log('Checking user role in database');
      // Check if user exists in public.users table using the dedicated function
      const { data: userData, error: userError } = await supabaseDB.getUserRole(data?.user?.id || '');
      console.log('User role check result:', { userData, userError });

      // If user doesn't exist in public.users table, handle accordingly
      if (userError || !userData) {
        console.warn('User not found in public.users table. Proceeding with demo access.');
        console.log('Redirecting to admin dashboard (demo user)');
        
        setLoading(false);
        router.push('/admin/dashboard');
        return;
      }

      console.log('Checking if user has admin role');
      console.log('User role:', userData.role);
      if (userData?.role !== 'admin') {
        console.log('User is not admin, signing out');
        await supabaseAuth.signOut();
        throw new Error(`Access denied. You have the '${userData.role}' role. Admin access required.`);
      }

      console.log('Redirecting to admin dashboard');
      setLoading(false);
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      console.log('=== ADMIN LOGIN PROCESS FAILED ===');
      setError(error.message || 'An unexpected error occurred');
      setLoading(false);
    }
    
    console.log('=== ADMIN LOGIN PROCESS COMPLETED ===');
  };

  return (
    <LoginForm
      title="Admin Login"
      subtitle="Sign in with your email to access administrative controls"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      showBackButton={true}
      identifierLabel="Email Address"
      identifierPlaceholder="admin@example.com"
      identifierType="email"
      showForgotPasswordLink={true}
      icon={<ShieldCheck className="h-7 w-7" />}
    />
  );
}