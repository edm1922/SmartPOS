-- Remove all "test" data (product + customer + their transactions) created on 2026-08-10.
-- Run this in the Supabase Dashboard > SQL Editor.
-- Order matters: transactions first (transaction_items cascade),
-- then product, then customer (FK constraint blocks customer while transactions remain).

-- 1. Delete the transactions
DELETE FROM public.transactions
WHERE id IN (
  '20199457-8a5f-43a6-baac-529ea04ed802', -- term, 470.40 (customer "test" + product "test")
  '3a629a7d-43d7-4482-8443-08433e3b12d2', -- cheque, 313.60, cancelled (product "test")
  '9274a5a5-9e4b-482c-aca5-86425861b8ec'  -- cheque, 470.40 (customer "test" + product "test")
);

-- 2. Delete the product "test" (hard delete, removes soft-delete flag too)
DELETE FROM public.products
WHERE id = 'ef44c5c1-ed84-43c0-a07b-559db5fd277f';

-- 3. Delete the customer "test" (must run after transactions)
DELETE FROM public.customers
WHERE id = 'f613cdac-7e7a-4499-931f-41ce440dceed';
