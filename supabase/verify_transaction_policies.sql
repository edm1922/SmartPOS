-- Verify that the transaction policies have been applied correctly

-- Check transactions table policies
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

-- Check transaction_items table policies
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
AND tablename = 'transaction_items'
ORDER BY policyname;

-- Check cashiers table policies
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
AND tablename = 'cashiers'
ORDER BY policyname;

-- Test a sample transaction insertion (replace 'CASHIER_ID_HERE' with an actual cashier ID)
-- This should work after applying the fixes
/*
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('CASHIER_ID_HERE', 100.00, 'cash', 'completed')
RETURNING *;
*/