-- Verify that the schema fixes have been applied correctly

-- Check foreign key constraints on transactions table
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'transactions' AND tc.constraint_type = 'FOREIGN KEY';

-- Check RLS policies on transactions table
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

-- Verify the cashier exists and is active
SELECT id, username, is_active 
FROM cashiers 
WHERE id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1';

-- Test inserting a transaction (this should work now)
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 99.99, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction
DELETE FROM transactions WHERE cashier_id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' AND total_amount = 99.99;

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'transactions' 
AND table_schema = 'public';