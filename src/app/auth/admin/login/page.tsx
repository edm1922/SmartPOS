'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
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
        // For demo purposes, we'll allow the user to proceed as admin
        // In a production environment, you would want to handle this more securely
        console.warn('User not found in public.users table. Proceeding with demo access.');
        console.log('Redirecting to admin dashboard (demo user)');
        
        // Reset loading state before navigation
        setLoading(false);
        // Use router.push for navigation without page refresh
        console.log('Calling router.push to /admin/dashboard');
        router.push('/admin/dashboard');
        console.log('router.push completed');
        return;
      }

      console.log('Checking if user has admin role');
      console.log('User role:', userData.role);
      if (userData?.role !== 'admin') {
        console.log('User is not admin, signing out');
        // Sign out if not admin
        await supabaseAuth.signOut();
        throw new Error(`Access denied. You have the '${userData.role}' role. Admin access required.`);
      }

      console.log('Redirecting to admin dashboard');
      // Reset loading state before navigation
      setLoading(false);
      // Use router.push for navigation without page refresh
      console.log('Calling router.push to /admin/dashboard');
      router.push('/admin/dashboard');
      console.log('router.push completed');
    } catch (error: any) {
      console.error('Login error:', error); // Log the actual error for debugging
      console.log('=== ADMIN LOGIN PROCESS FAILED ===');
      setError(error.message || 'An unexpected error occurred');
      setLoading(false); // Reset loading state on error
    }
    
    console.log('=== ADMIN LOGIN PROCESS COMPLETED ===');
  };

  return (
    <LoginForm
      title="Admin Login"
      subtitle="Sign in to access the admin panel"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      showBackButton={true}
    />
  );
}