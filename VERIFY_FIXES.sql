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

-- Check that the INSERT policy has the correct CHECK condition
-- It should include: (cashier_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cashiers WHERE id = cashier_id AND is_active = true))

-- Test a sample transaction insertion (replace '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' with your actual cashier ID)
-- This should work after applying the fixes
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 100.00, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction (uncomment if needed)
-- DELETE FROM transactions WHERE cashier_id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' AND total_amount = 100.00;