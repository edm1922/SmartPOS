-- Fix the discount_type CHECK constraint on the existing transactions table.
-- The POS app writes 'fixed' for peso-amount discounts, but the original
-- constraint only allowed 'percentage', causing discounted sales to fail.
-- Run this once in the Supabase SQL Editor.

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_discount_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'amount', 'fixed'));