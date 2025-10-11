import { handleSupabaseError, supabaseAuth, supabaseDB } from './supabaseClient';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    removeChannel: jest.fn(),
  }),
}));

describe('Supabase Client', () => {
  describe('handleSupabaseError', () => {
    it('returns null when no error is provided', () => {
      expect(handleSupabaseError(null, 'test operation')).toBeNull();
    });

    it('returns a formatted error message when error is provided', () => {
      const error = { message: 'Test error' };
      expect(handleSupabaseError(error, 'test operation')).toBe('Test error');
    });

    it('returns a default error message when no message is provided', () => {
      const error = {};
      expect(handleSupabaseError(error, 'test operation')).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles specific error messages correctly', () => {
      const invalidLoginError = { message: 'Invalid login credentials' };
      expect(handleSupabaseError(invalidLoginError, 'sign in')).toBe('Invalid email or password. Please try again.');
      
      const emailNotConfirmedError = { message: 'Email not confirmed' };
      expect(handleSupabaseError(emailNotConfirmedError, 'sign in')).toBe('Please confirm your email address before logging in.');
    });
  });

  describe('supabaseAuth', () => {
    it('signInWithEmail returns data when successful', async () => {
      const mockData = { user: { id: '123', email: 'test@example.com' } };
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.auth.signInWithPassword.mockResolvedValue({ data: mockData, error: null });
      
      const result = await supabaseAuth.signInWithEmail('test@example.com', 'password');
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('signInWithEmail returns error when authentication fails', async () => {
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });
      
      const result = await supabaseAuth.signInWithEmail('test@example.com', 'wrongpassword');
      expect(result).toEqual({ data: null, error: 'Invalid email or password. Please try again.' });
    });

    it('signOut returns null error when successful', async () => {
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.auth.signOut.mockResolvedValue({ error: null });
      
      const result = await supabaseAuth.signOut();
      expect(result).toEqual({ error: null });
    });

    it('getSession returns data when successful', async () => {
      const mockSession = { session: { user: { id: '123' } } };
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.auth.getSession.mockResolvedValue({ data: mockSession, error: null });
      
      const result = await supabaseAuth.getSession();
      expect(result).toEqual({ data: mockSession, error: null });
    });
  });

  describe('supabaseDB', () => {
    it('getProducts returns data when successful', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 10.99 },
        { id: '2', name: 'Product 2', price: 15.99 }
      ];
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.from().select().order.mockResolvedValue({ data: mockProducts, error: null });
      
      const result = await supabaseDB.getProducts();
      expect(result).toEqual({ data: mockProducts, error: null });
    });

    it('updateProductStock returns data when successful', async () => {
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.from().update().eq.mockResolvedValue({ data: {}, error: null });
      
      const result = await supabaseDB.updateProductStock('1', 5);
      expect(result).toEqual({ data: {}, error: null });
    });

    it('getUserRole returns data when successful', async () => {
      const mockRole = { role: 'admin' };
      const supabase = require('@supabase/supabase-js').createClient();
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockRole, error: null });
      
      supabase.from = jest.fn().mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });
      
      const result = await supabaseDB.getUserRole('123');
      expect(result).toEqual({ data: mockRole, error: null });
      expect(selectMock).toHaveBeenCalledWith('role');
      expect(eqMock).toHaveBeenCalledWith('id', '123');
    });
  });
});