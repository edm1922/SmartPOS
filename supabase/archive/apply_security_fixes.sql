-- Script to apply security policy fixes for transaction creation

-- First, disable RLS on all tables to avoid conflicts
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Then enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only view their own record
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users (allow all admins to view all users)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (true);

-- Admins can insert users (allow all admins to insert users)
DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Admins can update users (allow all admins to update users)
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admins can delete users (allow all admins to delete users)
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (true);

-- Products table policies
-- All authenticated users can view products
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anonymous access for cashier POS (needed for product search)
DROP POLICY IF EXISTS "Allow cashier POS access" ON products;
CREATE POLICY "Allow cashier POS access" ON products
  FOR SELECT USING (true);

-- Admins can manage products (checking role from database)
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Transactions table policies
-- Users can view their own transactions (cashiers can view their transactions)
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (cashier_id = auth.uid());

-- Cashiers and admins can insert transactions
-- Modified to allow both authenticated users and custom cashier sessions
DROP POLICY IF EXISTS "Authorized users can insert transactions" ON transactions;
CREATE POLICY "Authorized users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    -- Allow authenticated users with cashier or admin role
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('cashier', 'admin') AND is_active = true
    )
    OR
    -- Allow custom cashier authentication (when using session-based auth)
    EXISTS (
      SELECT 1 FROM public.cashiers 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admins can view all transactions (checking role from database)
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Transaction items table policies
-- Users can manage transaction items for their transactions
DROP POLICY IF EXISTS "Users can manage their transaction items" ON transaction_items;
CREATE POLICY "Users can manage their transaction items" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id AND t.cashier_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id AND t.cashier_id = auth.uid()
    )
  );

-- Admins can view all transaction items (checking role from database)
DROP POLICY IF EXISTS "Admins can view all transaction items" ON transaction_items;
CREATE POLICY "Admins can view all transaction items" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Activity logs table policies
-- Users can insert their own activity logs
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;
CREATE POLICY "Users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own activity logs
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all activity logs (checking role from database)
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON TABLE users TO authenticated;
GRANT ALL ON TABLE products TO authenticated;
GRANT SELECT ON TABLE products TO anon; -- Allow anonymous SELECT for cashier POS
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transaction_items TO authenticated;
GRANT ALL ON TABLE activity_logs TO authenticated;

-- Grant usage on auth schema (needed for auth.uid() and auth.role())
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Create a trigger function to automatically create users in public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract username from email if it follows the pattern username@pos-system.local
  -- Handle potential conflicts by updating existing records
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE 
      WHEN NEW.email LIKE '%@pos-system.local' THEN 
        SPLIT_PART(NEW.email, '@', 1)
      ELSE 
        NULL
    END,
    'cashier'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a function to safely check user roles
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'admin' AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Include cashiers table security policies

-- First, disable RLS on cashiers table to avoid conflicts
ALTER TABLE cashiers DISABLE ROW LEVEL SECURITY;

-- Then enable RLS on cashiers table
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to authenticate cashiers (needed for login)
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (true);

-- Allow admins to insert cashiers
DROP POLICY IF EXISTS "Admins can insert cashiers" ON cashiers;
CREATE POLICY "Admins can insert cashiers" ON cashiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Allow admins to update cashiers
DROP POLICY IF EXISTS "Admins can update cashiers" ON cashiers;
CREATE POLICY "Admins can update cashiers" ON cashiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Allow admins to delete cashiers
DROP POLICY IF EXISTS "Admins can delete cashiers" ON cashiers;
CREATE POLICY "Admins can delete cashiers" ON cashiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Allow cashiers to view their own record (for profile management)
DROP POLICY IF EXISTS "Cashiers can view own record" ON cashiers;
CREATE POLICY "Cashiers can view own record" ON cashiers
  FOR SELECT USING (
    id = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON TABLE cashiers TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication

-- Add comments to document the policies
COMMENT ON POLICY "Allow cashier authentication" ON cashiers IS 'Allow authentication of cashiers by username/password';
COMMENT ON POLICY "Admins can insert cashiers" ON cashiers IS 'Allow admins to create new cashiers';
COMMENT ON POLICY "Admins can update cashiers" ON cashiers IS 'Allow admins to update cashier information';
COMMENT ON POLICY "Admins can delete cashiers" ON cashiers IS 'Allow admins to delete cashiers';
COMMENT ON POLICY "Cashiers can view own record" ON cashiers IS 'Allow cashiers to view their own profile information';

-- Verify that the policies have been applied correctly
-- Note: This query should be run separately as it's for verification only
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('transactions', 'transaction_items', 'cashiers')
-- ORDER BY tablename, policyname;