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

-- 6. Delete test products (products not seeded by schema.sql)
-- Keeps the 5 seed products (Wireless Headphones, Smartphone Case, etc.)
-- Delete any product where name contains 'test' (case-insensitive)
DELETE FROM products
WHERE LOWER(name) LIKE '%test%'
   OR LOWER(description) LIKE '%test%';

-- 7. Delete test customers (keeps the 3 seed customers: Humphrey, Audrey, Marlon)
DELETE FROM customers
WHERE LOWER(name) LIKE '%test%';

-- 8. Reset product stock for seed products back to default values
UPDATE products SET stock_quantity = 25  WHERE name = 'Wireless Headphones';
UPDATE products SET stock_quantity = 100 WHERE name = 'Smartphone Case';
UPDATE products SET stock_quantity = 75  WHERE name = 'USB-C Cable';
UPDATE products SET stock_quantity = 30  WHERE name = 'Bluetooth Speaker';
UPDATE products SET stock_quantity = 15  WHERE name = 'Laptop Stand';
