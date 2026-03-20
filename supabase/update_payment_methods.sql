-- Update payment_method check constraint to include 'cheque'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque'));
