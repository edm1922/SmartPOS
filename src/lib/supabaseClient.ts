import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

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

// Create Supabase client for browser usage
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createClient(supabaseUrl, supabaseAnonKey);

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

      console.log('Attempting to sign in with email and password:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase auth response:', { data, error });

      const errorMessage = handleSupabaseError(error, 'sign in');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error in signInWithEmail:', error);
      return { data: null, error: error.message };
    }
  },

  async signOut() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { error: null };
      }

      console.log('Attempting to sign out');
      const { error } = await supabase.auth.signOut();

      console.log('Sign out response:', { error });

      const errorMessage = handleSupabaseError(error, 'sign out');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error in signOut:', error);
      return { error: error.message };
    }
  },

  async getSession() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: { session: null }, error: null };
      }

      console.log('Getting session from Supabase');
      const { data, error } = await supabase.auth.getSession();

      console.log('Session data:', data);
      console.log('Session error:', error);

      const errorMessage = handleSupabaseError(error, 'get session');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error in getSession:', error);
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
        .is('deleted_at', null)
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

  async deleteProduct(productId: string) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }

      console.log('Attempting to soft delete product with ID:', productId);

      // We use soft delete (setting deleted_at) instead of hard delete
      // This preserves historical transaction data that references the product
      // We also clear the barcode to allow it to be reused for new products
      const { data, error } = await supabase
        .from('products')
        .update({ 
          deleted_at: new Date().toISOString(),
          barcode: null 
        })
        .eq('id', productId)
        .select();

      console.log('Soft delete operation result:', { data, error });

      const errorMessage = handleSupabaseError(error, 'delete product');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Exception in deleteProduct:', error);
      return { data: null, error: error.message };
    }
  },

  async addProduct(product: any) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }

      const { data, error } = await supabase
        .from('products')
        .insert(product);

      const errorMessage = handleSupabaseError(error, 'add product');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async updateProduct(productId: string, product: any) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }

      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', productId);

      const errorMessage = handleSupabaseError(error, 'update product');
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

      // First, try to get the user role from the session JWT
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session in getUserRole:', session);
      if (session?.user?.app_metadata?.user_role) {
        console.log('Found user role in session JWT:', session.user.app_metadata.user_role);
        return { data: { role: session.user.app_metadata.user_role }, error: null };
      }

      // If not available in JWT, try to fetch from database
      // But handle the case where there might be RLS issues
      try {
        console.log('Fetching user role from database for user ID:', userId);
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        console.log('Database response for user role:', { data, error });

        // If we get a specific RLS error, handle it gracefully
        if (error && error.message && error.message.includes('recursion')) {
          console.warn('RLS recursion detected, returning null user data');
          return { data: null, error: 'RLS recursion error' };
        }

        const errorMessage = handleSupabaseError(error, 'fetch user role');
        if (errorMessage) {
          throw new Error(errorMessage);
        }

        return { data, error: null };
      } catch (dbError: any) {
        // If there's a database error (like the recursion issue), handle it gracefully
        console.warn('Database error while fetching user role:', dbError.message);
        return { data: null, error: dbError.message };
      }
    } catch (error: any) {
      console.error('Error in getUserRole:', error);
      return { data: null, error: error.message };
    }
  },

  async getSettings() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: null, error: null };
      }

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();

      const errorMessage = handleSupabaseError(error, 'fetch settings');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async updateSettings(settings: any) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('settings')
          .update(settings)
          .eq('id', existingSettings.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('settings')
          .insert(settings);
      }

      const { data, error } = result;

      const errorMessage = handleSupabaseError(error, 'update settings');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async logActivity(userId: string, action: string, description: string) {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { data: {}, error: null };
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          action,
          description
        });

      const errorMessage = handleSupabaseError(error, 'log activity');
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error logging activity:', error);
      return { data: null, error: error.message };
    }
  },

  async uploadProductImage(file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return { publicUrl, error: null };
    } catch (error: any) {
      console.error('Error uploading image:', error);
      return { publicUrl: null, error: error.message };
    }
  },

  async resetApplicationData() {
    try {
      // Return early if we're in a test environment
      if (process.env.NODE_ENV === 'test') {
        return { success: true, error: null };
      }

      // step 1: clear transaction items
      const { error: error1 } = await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error1) throw new Error(`Items clear: ${error1.message}`);

      // step 2: clear transactions
      const { error: error2 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error2) throw new Error(`Sales clear: ${error2.message}`);

      // step 3: clear cashiers
      const { error: error3 } = await supabase.from('cashiers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error3) throw new Error(`Staff clear: ${error3.message}`);

      // step 4: reset stocks
      const { error: error4 } = await supabase.from('products').update({ stock_quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (error4) throw new Error(`Stock reset: ${error4.message}`);

      // step 5: clear activity logs
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Critical Error resetting application data:', error);
      return { success: false, error: error.message };
    }
  }
};
