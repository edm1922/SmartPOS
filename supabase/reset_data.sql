-- Reset all transactions, term payments, and test data
-- Run this in Supabase SQL Editor

-- 1. Term payment allocations (child of term_payments and transactions)
DELETE FROM term_payment_allocations;

-- 2. Term payments
DELETE FROM term_payments;

-- 3. Transaction items (child of transactions)
DELETE FROM transaction_items;

-- 4. Transactions
DELETE FROM transactions;

-- 5. Activity logs
DELETE FROM activity_logs;

-- 6. Delete test products (products not manually created by users)
DELETE FROM products
WHERE LOWER(name) LIKE '%test%'
   OR LOWER(description) LIKE '%test%';

-- 7. Delete test customers (customers not manually created by users)
DELETE FROM customers
WHERE LOWER(name) LIKE '%test%';
