-- Debug script to check current policies on transactions table

-- Check all policies on the transactions table
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

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'transactions' 
AND table_schema = 'public';

-- Check if the cashier exists and is active
SELECT id, username, is_active 
FROM cashiers 
WHERE id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1';

-- Test direct insert with a simple query
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 1.00, 'cash', 'completed')
RETURNING id;