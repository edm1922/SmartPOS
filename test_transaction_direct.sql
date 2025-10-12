-- Test script to verify transaction insertion works directly in SQL
-- Replace '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' with your actual cashier ID

-- First, verify the cashier exists and is active
SELECT id, username, is_active 
FROM cashiers 
WHERE id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1';

-- Check current policies on transactions table
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'transactions'
ORDER BY policyname;

-- Test inserting a transaction directly
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 99.99, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction (uncomment if needed)
-- DELETE FROM transactions WHERE cashier_id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' AND total_amount = 99.99;