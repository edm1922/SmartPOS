-- Fix the transactions table schema to properly reference the cashiers table

-- Drop the existing foreign key constraint that references users table
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_cashier_id_fkey;

-- Add a new foreign key constraint that references the cashiers table
ALTER TABLE transactions 
ADD CONSTRAINT transactions_cashier_id_fkey 
FOREIGN KEY (cashier_id) REFERENCES cashiers(id);

-- Verify the constraint was added correctly
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

-- Test the fix with your cashier ID
-- This should now work without foreign key constraint violations
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 99.99, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction
DELETE FROM transactions WHERE cashier_id = '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' AND total_amount = 99.99;