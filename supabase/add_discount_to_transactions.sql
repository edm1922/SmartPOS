-- Add discount columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN transactions.discount_type IS 'Type of discount applied (percentage)';
COMMENT ON COLUMN transactions.discount_value IS 'The discount percentage value (e.g. 10 for 10%)';
COMMENT ON COLUMN transactions.discount_amount IS 'Computed discount amount in currency';
