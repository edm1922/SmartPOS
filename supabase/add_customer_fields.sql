-- Migration: Add address, tin_number, and balance_override columns to customers table
-- Run this SQL in your Supabase SQL Editor to add the new fields

ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tin_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_override NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN customers.address IS 'Customer address';
COMMENT ON COLUMN customers.tin_number IS 'Tax Identification Number';
COMMENT ON COLUMN customers.balance_override IS 'Manual balance adjustment added to auto-calculated term balance';

-- Allow anyone to update customers (cashier POS needs to edit customer details)
DROP POLICY IF EXISTS "Anyone can update customers" ON customers;
CREATE POLICY "Anyone can update customers" ON customers
  FOR UPDATE USING (true);

-- Allow anyone to delete customers (cashier POS needs to remove customers)
DROP POLICY IF EXISTS "Anyone can delete customers" ON customers;
CREATE POLICY "Anyone can delete customers" ON customers
  FOR DELETE USING (true);

-- Re-grant permissions
GRANT ALL ON TABLE customers TO authenticated;
GRANT ALL ON TABLE customers TO anon;
