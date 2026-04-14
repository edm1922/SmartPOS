-- Add reference_number column if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Update the check constraint to include cheque
DO $$ 
BEGIN
  -- First drop the old constraint
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
  
  -- Add the new constraint with 'cheque'
  ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque'));
EXCEPTION
  WHEN undefined_object THEN
    -- If constraint didn't exist initially, just add the new one
    ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
      CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque'));
END $$;
