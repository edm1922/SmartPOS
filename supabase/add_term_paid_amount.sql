-- Add term_paid_amount to transactions for tracking partial term payments
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS term_paid_amount DECIMAL(10,2) DEFAULT 0;

-- Update payment_method check to include term_payment
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque', 'term', 'term_payment'));

COMMENT ON COLUMN transactions.term_paid_amount IS 'Amount already paid toward this term transaction (FIFO)';
