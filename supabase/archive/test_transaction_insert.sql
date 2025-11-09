-- Test script to verify transaction insertion works after applying fixes
-- Replace 'CASHIER_ID_HERE' with an actual active cashier ID from your database

-- First, verify the cashier exists and is active
SELECT id, username, is_active 
FROM cashiers 
WHERE id = 'CASHIER_ID_HERE';

-- Then test inserting a transaction for that cashier
INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
VALUES ('CASHIER_ID_HERE', 99.99, 'cash', 'completed')
RETURNING *;

-- Clean up the test transaction (uncomment if needed)
-- DELETE FROM transactions WHERE cashier_id = 'CASHIER_ID_HERE' AND total_amount = 99.99;