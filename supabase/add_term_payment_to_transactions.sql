-- Add term/installment payment method to transactions table

-- Update payment_method check constraint to include 'term'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque', 'term', 'term_payment'));

-- Term payment columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS down_payment DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS term_remaining_balance DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS term_due_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS term_status TEXT DEFAULT 'pending'
  CHECK (term_status IN ('pending', 'paid'));

COMMENT ON COLUMN transactions.down_payment IS 'Down payment collected at the time of sale for term payments';
COMMENT ON COLUMN transactions.term_remaining_balance IS 'Remaining balance due for term payments';
COMMENT ON COLUMN transactions.term_due_date IS 'Date when the remaining balance is due (typically 30 days from sale)';
COMMENT ON COLUMN transactions.term_status IS 'Status of the term payment: pending or paid';
