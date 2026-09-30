-- Records an incoming term payment, allocates it FIFO, and writes an audit row.
--
-- Why an RPC instead of the previous direct client inserts
-- -------------------------------------------------------
-- The cashier POS used to INSERT into term_payments and term_payment_allocations
-- directly, then call update_transaction_term_paid_amount() once per allocation.
-- That is three round trips, leaves a half-written payment if a later step fails,
-- and leaves NO audit trail: cashiers hold the anon key and activity_logs only
-- allows `user_id = auth.uid()`, which is NULL for them.
--
-- This function does all of it in one transaction and writes the audit row
-- server-side, so every recorded payment is attributable to a named cashier.
-- SECURITY DEFINER is required for the same reason as the manual entry RPCs.
--
-- Run AFTER add_term_account_admin_only.sql and add_term_paid_amount_function.sql.

-- Drops every known earlier variant so re-running this file never leaves two
-- record_term_payment overloads behind (PostgREST then refuses to route by
-- name). The signatures below are the ones from earlier drafts of this file.
DROP FUNCTION IF EXISTS public.record_term_payment(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.record_term_payment(UUID, UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.record_term_payment(UUID, UUID, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB);

-- Parameter order is deliberate: Postgres rejects (42P13) a parameter with no
-- default that comes after one that has a default, so every required parameter
-- is declared first and the optional ones follow.
CREATE OR REPLACE FUNCTION public.record_term_payment(
  p_customer_id       UUID,
  p_cashier_id        UUID,
  p_amount            DECIMAL,
  -- How much of the payment settles the customer's unlinked balance
  -- (balance_override). Kept separate from p_allocations because the override
  -- is not a transaction row the FIFO loop can clamp against.
  p_override_alloc    DECIMAL DEFAULT 0,
  p_cashier_name      TEXT    DEFAULT NULL,
  p_payment_method    TEXT    DEFAULT 'cash',
  p_reference_number  TEXT    DEFAULT NULL,
  p_notes             TEXT    DEFAULT NULL,
  -- FIFO targets as [{ "transaction_id": "<uuid>", "amount": 100.00 }, ...]
  p_allocations       JSONB   DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_customer   TEXT;
  v_remaining  DECIMAL := p_amount;
  v_alloc      RECORD;
  v_tx_owed    DECIMAL;
  v_tx_paid    DECIMAL;
  v_take       DECIMAL;
  v_allocated  DECIMAL := 0;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'A customer is required to record a term payment';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'Allocations must be an array';
  END IF;

  SELECT name INTO v_customer FROM public.customers WHERE id = p_customer_id;
  IF v_customer IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Two caller shapes, matching the manual-entry RPC house pattern:
  --   * anon cashier (no Auth session): p_cashier_id must name an active
  --     cashier, and the audit row is attributed to them.
  --   * authenticated admin: is_active_admin() gates, and the audit row is
  --     attributed to auth.uid() instead of a cashier.
  IF NOT public.is_active_admin() THEN
    IF p_cashier_id IS NULL THEN
      RAISE EXCEPTION 'Cashier information is required to record a payment';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.cashiers
       WHERE id = p_cashier_id AND is_active IS TRUE AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Cashier account is not active';
    END IF;
  END IF;

  -- The payment row is created first so allocations can reference it. Any
  -- portion the override bucket absorbs is reconciled below against
  -- p_override_alloc.
  INSERT INTO public.term_payments (
    customer_id, cashier_id, amount, payment_method, reference_number, notes
  ) VALUES (
    p_customer_id, p_cashier_id, p_amount, p_payment_method,
    NULLIF(btrim(COALESCE(p_reference_number, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), '')
  )
  RETURNING id INTO v_payment_id;

  -- FIFO: the caller sends oldest-first, but clamping each line to what that
  -- transaction still owes is what keeps the sum honest when a stale figure
  -- arrives from the client.
  FOR v_alloc IN
    SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    EXIT WHEN v_remaining <= 0;

    SELECT COALESCE(t.term_remaining_balance, t.total_amount, 0) - COALESCE(t.term_paid_amount, 0),
           COALESCE(t.term_paid_amount, 0)
      INTO v_tx_owed, v_tx_paid
      FROM public.transactions t
     WHERE t.id = NULLIF(btrim(COALESCE(v_alloc->>'transaction_id', '')), '')::UUID
       -- The caller may only settle this customer's own open term transactions;
       -- anything else is ignored rather than trusted.
       AND t.customer_id = p_customer_id
       AND t.payment_method = 'term'
       AND t.status = 'completed'
       AND t.voided_at IS NULL;

    CONTINUE WHEN v_tx_owed IS NULL OR v_tx_owed <= 0;

    v_take := LEAST(
      v_remaining,
      v_tx_owed,
      COALESCE(NULLIF(btrim(COALESCE(v_alloc->>'amount', '')), '')::DECIMAL, v_tx_owed)
    );
    CONTINUE WHEN v_take <= 0;

    INSERT INTO public.term_payment_allocations (term_payment_id, transaction_id, amount)
    VALUES (v_payment_id, NULLIF(btrim(COALESCE(v_alloc->>'transaction_id', '')), '')::UUID, v_take);

    -- Keep the denormalised running total in step with the allocation.
    UPDATE public.transactions
       SET term_paid_amount = v_tx_paid + v_take
     WHERE id = NULLIF(btrim(COALESCE(v_alloc->>'transaction_id', '')), '')::UUID;

    v_remaining  := v_remaining - v_take;
    v_allocated  := v_allocated + v_take;
  END LOOP;

  -- The override bucket is not a transaction row, so the register settles it by
  -- sending p_override_alloc separately. balance_override is a POSITIVE debt, so
  -- a payment against it must DEcrement the balance. The old draft ADDED any
  -- leftover back to it, which doubled the balance every time an override debt
  -- was paid.
  --
  -- The whole payment must reconcile, so the unapplied remainder after the FIFO
  -- loop has to match exactly what the client said it put on the override
  -- bucket. If they disagree, the row is rolled back rather than corrupting a
  -- balance. The 0.01 tolerance absorbs the client's float rounding.
  IF abs(v_remaining - p_override_alloc) > 0.01 THEN
    RAISE EXCEPTION 'Payment amount % cannot be fully allocated: unallocated %, override applied %',
      p_amount, v_remaining, p_override_alloc;
  END IF;

  IF p_override_alloc > 0 THEN
    UPDATE public.customers
       SET balance_override = COALESCE(balance_override, 0) - p_override_alloc,
           balance_override_updated_at = now(),
           updated_at = now()
     WHERE id = p_customer_id
       AND COALESCE(balance_override, 0) >= p_override_alloc;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot apply % to balance_override: it exceeds the customer''s unlinked balance', p_override_alloc;
    END IF;
    v_remaining := v_remaining - p_override_alloc;
  END IF;

  -- The audit row. Cashiers have no Auth session, so auth.uid() is NULL and
  -- actor_cashier_id carries the identity; admins are attributed to their real
  -- user_id instead of a phantom cashier.
  IF public.is_active_admin() THEN
    INSERT INTO public.activity_logs (user_id, actor_role, action, description, metadata)
    VALUES (
      auth.uid(), 'admin', 'term_payment_recorded',
      format('Recorded term payment %s for %s', p_amount, v_customer),
      jsonb_build_object(
        'term_payment_id', v_payment_id,
        'customer_id', p_customer_id,
        'customer_name', v_customer,
        'amount', p_amount,
        'allocated', v_allocated,
        'unapplied', v_remaining,
        'override_applied', p_override_alloc,
        'payment_method', p_payment_method,
        'reference_number', NULLIF(btrim(COALESCE(p_reference_number, '')), '')
      )
    );
  ELSE
    INSERT INTO public.activity_logs (user_id, actor_cashier_id, actor_role, action, description, metadata)
    VALUES (
      NULL, p_cashier_id, 'cashier', 'term_payment_recorded',
      format('Recorded term payment %s for %s by %s',
             p_amount, v_customer, COALESCE(p_cashier_name, 'unknown cashier')),
      jsonb_build_object(
        'term_payment_id', v_payment_id,
        'customer_id', p_customer_id,
        'customer_name', v_customer,
        'amount', p_amount,
        'allocated', v_allocated,
        'unapplied', v_remaining,
        'override_applied', p_override_alloc,
        'payment_method', p_payment_method,
        'reference_number', NULLIF(btrim(COALESCE(p_reference_number, '')), ''),
        'cashier_id', p_cashier_id
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment_id,
    'amount', p_amount,
    'allocated', v_allocated,
    'unapplied', v_remaining
  );
END;
$$;

COMMENT ON FUNCTION public.record_term_payment IS
  'Records an incoming term payment, allocates it FIFO across the given transactions, settles the customer balance_override by p_override_alloc, and writes the attributed activity_logs entry. Cashiers (anon) must pass an active p_cashier_id; admins are throttled to an active admin session.';

-- EXECUTE to anon is intentional: recording a payment is a cashier duty. The
-- audit row is what makes it reviewable, and add_term_account_admin_only.sql
-- keeps UPDATE/DELETE and undo_term_payment admin-only.
-- The argument-type list must match the signature exactly: UUID, UUID, DECIMAL,
-- then the optional DECIMAL + TEXTs, then the JSONB allocations.
GRANT EXECUTE ON FUNCTION public.record_term_payment(UUID, UUID, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_term_payment(UUID, UUID, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
