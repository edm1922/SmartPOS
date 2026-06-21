-- SECURITY DEFINER function to update term_paid_amount (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_transaction_term_paid_amount(
  p_transaction_id UUID,
  p_term_paid_amount DECIMAL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.transactions
  SET term_paid_amount = p_term_paid_amount
  WHERE id = p_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.update_transaction_term_paid_amount IS 
  'Updates term_paid_amount on a transaction. Runs with owner privileges to bypass RLS.';
