-- Reverses a term payment: reverts term_paid_amount on transactions and deletes the payment record.
-- Runs with SECURITY DEFINER to bypass RLS (cashiers aren't authenticated via Supabase Auth).
CREATE OR REPLACE FUNCTION public.undo_term_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  alloc RECORD;
BEGIN
  -- Revert term_paid_amount for each transaction this payment was allocated to
  FOR alloc IN
    SELECT transaction_id, amount
    FROM term_payment_allocations
    WHERE term_payment_id = p_payment_id
  LOOP
    UPDATE transactions
    SET term_paid_amount = GREATEST(0, COALESCE(term_paid_amount, 0) - alloc.amount)
    WHERE id = alloc.transaction_id;
  END LOOP;

  -- Delete the payment record (ON DELETE CASCADE removes term_payment_allocations)
  DELETE FROM term_payments WHERE id = p_payment_id;
END;
$$;

COMMENT ON FUNCTION public.undo_term_payment IS
  'Reverses a term payment: reverts term_paid_amount on transactions and deletes the payment record. Owner-privileges to bypass RLS.';
