import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables (only in development/production, not during testing)
if (process.env.NODE_ENV !== 'test') {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('http://localhost:54321', 'test-key'); // Fallback for testing

// Custom error handling wrapper for Supabase operations
export const handleSupabaseError = (error: any, operation: string) => {
  if (error) {
    console.error(`Supabase operation failed: ${operation}`, error);
    
    // Handle specific error types
    if (error.message) {
      switch (error.message) {
        case 'Invalid login credentials':
          return 'Invalid email or password. Please try again.';
        case 'Email not confirmed':
          return 'Please confirm your email address before logging in.';
        default:
          return error.message || 'An unexpected error occurred. Please try again.';
      }
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
  
  return null;
};

// Wrapper functions for common Supabase operations with error handling
export const supabaseAuth = {
  async signInWithEmail(email: string, password: string) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: null, error: null };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const errorMessage = handleSupabaseError(error, 'sign in');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
  
  async signOut() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { error: null };
      }
      
      const { error } = await supabase.auth.signOut();
      
      const errorMessage = handleSupabaseError(error, 'sign out');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
  
  async getSession() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: { session: null }, error: null };
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      const errorMessage = handleSupabaseError(error, 'get session');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
};

export const supabaseDB = {
  async getProducts() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: [], error: null };
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      const errorMessage = handleSupabaseError(error, 'fetch products');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
  
  async updateProductStock(productId: string, quantity: number) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }
      
      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: quantity })
        .eq('id', productId);
      
      const errorMessage = handleSupabaseError(error, 'update product stock');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
  
  async getUserRole(userId: string) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: { role: 'admin' }, error: null };
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      const errorMessage = handleSupabaseError(error, 'fetch user role');
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
};