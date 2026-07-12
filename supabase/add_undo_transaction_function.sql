-- Reverses a completed sale transaction: restores stock and marks transaction as cancelled.
-- Runs with SECURITY DEFINER to bypass RLS (cashiers aren't authenticated via Supabase Auth).
CREATE OR REPLACE FUNCTION public.undo_transaction(p_transaction_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Restore stock for each product in the transaction
  FOR item IN
    SELECT product_id, quantity
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity + item.quantity
    WHERE id = item.product_id;
  END LOOP;

  -- Mark the transaction as cancelled
  UPDATE public.transactions
  SET status = 'cancelled'
  WHERE id = p_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.undo_transaction IS
  'Reverses a completed sale: restores product stock and sets transaction status to cancelled. Owner-privileges to bypass RLS.';
