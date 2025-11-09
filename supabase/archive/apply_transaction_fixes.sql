-- Apply security policy fixes for transaction creation in cashier POS system

-- Fix transactions table policies to allow cashiers to insert transactions
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
    -- For custom authentication, check that the cashier_id matches a valid active cashier
    -- This is a simpler check that avoids recursion issues
    (cashier_id IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.cashiers 
       WHERE id = cashier_id AND is_active = true
     ))
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

-- Fix transaction items table policies
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

-- Fix cashiers table policies
-- Allow anyone to authenticate cashiers (needed for login)
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (true);

-- Allow cashiers to view their own record (for profile management)
DROP POLICY IF EXISTS "Cashiers can view own record" ON cashiers;
CREATE POLICY "Cashiers can view own record" ON cashiers
  FOR SELECT USING (
    id = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transaction_items TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication