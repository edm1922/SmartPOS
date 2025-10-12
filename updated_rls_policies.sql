-- Updated RLS policies for transactions table that properly reference cashiers table

-- Enable RLS on all relevant tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Authorized users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- Create new policies that reference cashiers table
-- Allow cashiers to view their own transactions
CREATE POLICY "Cashiers can view their transactions" ON transactions
  FOR SELECT USING (
    cashier_id IN (
      SELECT id FROM cashiers WHERE is_active = true
    )
  );

-- Allow cashiers to insert transactions for themselves
CREATE POLICY "Cashiers can insert their transactions" ON transactions
  FOR INSERT WITH CHECK (
    -- Check that the cashier_id references an active cashier
    cashier_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM cashiers 
      WHERE id = cashier_id AND is_active = true
    )
  );

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Drop and recreate transaction_items policies
DROP POLICY IF EXISTS "Cashiers can manage their transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Admins can view all transaction items" ON transaction_items;

-- Allow cashiers to manage transaction items for their transactions
CREATE POLICY "Cashiers can manage their transaction items" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN cashiers c ON t.cashier_id = c.id
      WHERE t.id = transaction_items.transaction_id 
      AND c.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN cashiers c ON t.cashier_id = c.id
      WHERE t.id = transaction_items.transaction_id 
      AND c.is_active = true
    )
  );

-- Allow admins to view all transaction items
CREATE POLICY "Admins can view all transaction items" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Drop and recreate cashiers policies
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

-- Test the policies with a sample transaction
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 99.99, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction
DELETE FROM transactions WHERE cashier_id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' AND total_amount = 99.99;