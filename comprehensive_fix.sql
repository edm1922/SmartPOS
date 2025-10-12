-- Comprehensive fix for transaction creation issues

-- First, let's ensure RLS is enabled on all relevant tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on transactions table
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Authorized users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- Create new policies for transactions table
-- Allow SELECT for users to view their own transactions
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (cashier_id = auth.uid());

-- Allow INSERT for authenticated users OR for valid cashier IDs
CREATE POLICY "Authorized users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    -- Allow authenticated users with cashier or admin role
    (EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('cashier', 'admin') AND is_active = true
    ))
    OR
    -- Allow custom cashier authentication
    (cashier_id IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.cashiers 
       WHERE id = cashier_id AND is_active = true
     ))
  );

-- Allow SELECT for admins to view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Fix transaction items table policies
DROP POLICY IF EXISTS "Users can manage their transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Admins can view all transaction items" ON transaction_items;

-- Users can manage transaction items for their transactions
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

-- Admins can view all transaction items
CREATE POLICY "Admins can view all transaction items" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Fix cashiers table policies
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
DROP POLICY IF EXISTS "Cashiers can view own record" ON cashiers;

-- Allow anyone to authenticate cashiers (needed for login)
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (true);

-- Allow cashiers to view their own record
CREATE POLICY "Cashiers can view own record" ON cashiers
  FOR SELECT USING (id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transaction_items TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Test the fix with a sample transaction
-- This should work after applying the fixes
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 100.00, 'cash', 'completed')
RETURNING *;