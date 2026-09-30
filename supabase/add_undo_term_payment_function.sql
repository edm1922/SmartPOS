-- Reverses a term payment: reverts term_paid_amount on transactions and deletes
-- the payment record (ON DELETE CASCADE removes term_payment_allocations).
-- Runs with SECURITY DEFINER so the audit row can be written, and is gated on
-- is_active_admin() so a stray authenticated (non-admin) caller cannot use it.
--
-- Note: reversals here do not readjust balance_override. Payments recorded
-- through record_term_payment() already decremented it at recording time; an
-- undo therefore restores the debits it reversed on the term transactions only.
CREATE OR REPLACE FUNCTION public.undo_term_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alloc          RECORD;
  v_admin        UUID := auth.uid();
  v_customer_id  UUID;
  v_customer     TEXT;
  v_amount       DECIMAL;
  v_method       TEXT;
  v_reverted     JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Admin role required to undo a term payment';
  END IF;

  -- Capture the payment row before it is deleted so the audit entry can carry it.
  SELECT tp.amount, tp.payment_method, tp.customer_id, c.name
    INTO v_amount, v_method, v_customer_id, v_customer
    FROM public.term_payments tp
    LEFT JOIN public.customers c ON c.id = tp.customer_id
   WHERE tp.id = p_payment_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Term payment % not found', p_payment_id;
  END IF;

  -- Revert term_paid_amount for each transaction this payment was allocated to
  FOR alloc IN
    SELECT transaction_id, amount
    FROM term_payment_allocations
    WHERE term_payment_id = p_payment_id
  LOOP
    UPDATE transactions
    SET term_paid_amount = GREATEST(0, COALESCE(term_paid_amount, 0) - alloc.amount)
    WHERE id = alloc.transaction_id;

    v_reverted := v_reverted || jsonb_build_array(
      jsonb_build_object('transaction_id', alloc.transaction_id, 'amount', alloc.amount)
    );
  END LOOP;

  -- Delete the payment record (ON DELETE CASCADE removes term_payment_allocations)
  DELETE FROM term_payments WHERE id = p_payment_id;

  INSERT INTO public.activity_logs (user_id, actor_role, action, description, metadata)
  VALUES (
    v_admin, 'admin', 'term_payment_undone',
    format('Undid term payment %s for %s', v_amount, COALESCE(v_customer, 'unknown customer')),
    jsonb_build_object(
      'term_payment_id', p_payment_id,
      'customer_id', v_customer_id,
      'customer_name', v_customer,
      'amount', v_amount,
      'payment_method', v_method,
      'reverted_allocations', v_reverted
    )
  );
END;
$$;

COMMENT ON FUNCTION public.undo_term_payment IS
  'Reverses a term payment: reverts term_paid_amount on transactions, deletes the payment record, and audits the reversal as an admin action. Gated on is_active_admin() and NOT callable by anon - see add_term_account_admin_only.sql.';

-- Undoing a payment destroys the audit trail of money that was received, so it is
-- deliberately NOT available to anon (cashiers). add_term_account_admin_only.sql
-- also REVOKEs from PUBLIC, which is what the implicit default grant covered.
REVOKE EXECUTE ON FUNCTION public.undo_term_payment(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.undo_term_payment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.undo_term_payment(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';