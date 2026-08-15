-- Permanently deletes a transaction (and its items) in case of an erroneous sale,
-- e.g. a double-charge incident. Restores product stock and clears term allocations first.
-- Runs with SECURITY DEFINER to bypass RLS, but only active admins may call it.
CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  item RECORD;
  is_admin BOOLEAN;
BEGIN
  -- Only allow active admins to hard-delete transactions
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only an active admin can delete a transaction.';
  END IF;

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

  -- Remove term payment allocations pointing at this transaction
  DELETE FROM term_payment_allocations WHERE transaction_id = p_transaction_id;

  -- Delete the transaction (transaction_items are removed via ON DELETE CASCADE)
  DELETE FROM public.transactions WHERE id = p_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.delete_transaction IS
  'Permanently deletes an erroneous transaction: restores stock, clears term allocations, and removes the record. Admin-only via SECURITY DEFINER.';
