-- Fix schema inconsistency between transactions table and cashier authentication

-- First, let's check the current structure of the tables
-- This will help us understand what we're working with
\d transactions
\d cashiers
\d users

-- The issue is that transactions.cashier_id references users.id, but we're authenticating against cashiers table
-- We have two options to fix this:

-- Option 1: Update the foreign key constraint to reference cashiers table instead of users table
-- This is the preferred approach since we have a separate cashiers table

-- First, drop the existing foreign key constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_cashier_id_fkey;

-- Then, add a new foreign key constraint that references the cashiers table
ALTER TABLE transactions 
ADD CONSTRAINT transactions_cashier_id_fkey 
FOREIGN KEY (cashier_id) REFERENCES cashiers(id);

-- Option 2: If we want to keep the reference to users table, we need to ensure cashiers exist in users table
-- This would require inserting cashier records into the users table as well

-- Let's verify the fix worked by checking the constraints
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

-- Test the fix with a sample transaction
-- Replace '507218ee-64dd-4ed5-a326-6faf6ef2b2b1' with your actual cashier ID
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('507218ee-64dd-4ed5-a326-6faf6ef2b2b1', 99.99, 'cash', 'completed')
RETURNING *;