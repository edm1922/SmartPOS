-- ============================================================================
-- SmartPOS - Combined term-payment migration
-- ----------------------------------------------------------------------------
-- WHY: the cashier POS records term payments through the record_term_payment()
-- RPC, but that function (and its dependencies) had not been applied to the
-- live Supabase database, so POST /rest/v1/rpc/record_term_payment returned 404.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste this whole file ->
-- set the query limit to 'No limit' -> Run. Every section is idempotent
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS), so re-running is safe.
--
-- SECTION ORDER (dependencies first):
--   1. add_manual_entry_functions.sql
--   2. create_term_payments_table.sql
--   3. add_term_payment_to_transactions.sql
--   4. add_term_paid_amount.sql
--   5. add_term_paid_amount_function.sql
--   6. add_customer_balance_override_updated_at.sql
--   7. add_term_account_admin_only.sql
--   8. add_record_term_payment_function.sql
--   9. add_undo_term_payment_function.sql
--   10. add_term_payment_admin_grant.sql
-- ============================================================================

-- ############################################################################
-- SOURCE: supabase/add_manual_entry_functions.sql
-- ############################################################################
-- ============================================================================
-- BIR Manual Sales Book Entry - RPCs
-- ----------------------------------------------------------------------------
-- Three entry points, all SECURITY DEFINER, all admin-gated where appropriate:
--
--   submit_manual_entry_request  - called by the CASHIER portal. Cashiers have
--       no Supabase Auth session (see src/app/auth/cashier/login/page.tsx), so
--       this cannot be auth-gated. It only ever writes a DRAFT to
--       manual_entry_requests, which counts toward nothing. The real control
--       point is review_manual_entry_request below.
--
--   review_manual_entry_request - called by the ADMIN portal. Gated on
--       auth.uid() being an active admin. This is the trust anchor that the
--       cashier path can never have.
--
--   void_manual_transaction     - called by the ADMIN portal. Same gate.
--
-- Every manual write goes through these functions rather than a direct table
-- insert. Note that transactions/transaction_items still carry
-- `WITH CHECK (true)` insert policies (see fix_stock_deduction.sql:33,38), so
-- the anon key can write rows directly via PostgREST; these paths are strictly
-- narrower than that, not a replacement for it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the current caller an active admin?
-- Probes information_schema (not to_regclass, which resolves relations, not
-- columns) so the check degrades gracefully if users.is_active has not been
-- applied yet.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'is_active'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.users
       WHERE id = v_uid AND role = 'admin' AND is_active = true
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = v_uid AND role = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_active_admin() IS
  'True when the current Supabase Auth caller is an active admin in public.users. Always false for cashiers, who have no Auth session.';

-- ----------------------------------------------------------------------------
-- 0. list_manual_entry_requests (CASHIER)
--    Cashiers have no Auth session, so they cannot be given a row-level policy
--    keyed on a real identity. This RPC is the least-bad read path: it scopes
--    results to the cashier id it is given, and it is exposed to anon only
--    because a client-asserted cashier id is forgeable in this architecture.
--    The same caveat applies to the pre-existing direct table writes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_manual_entry_requests(
  p_cashier_id UUID,
  p_status     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_cashier_id IS NULL THEN
    RAISE EXCEPTION 'Cashier information is required';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM public.manual_entry_requests r
     WHERE r.source_cashier_id = p_cashier_id
       AND (p_status IS NULL OR r.status = p_status)
  ), '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.list_manual_entry_requests IS
  'Returns the requesting cashier''s own manual entry drafts, optionally filtered by status.';

-- EXECUTE grants live in add_manual_entry_grants.sql, kept out of this file on
-- purpose: see the header of that file for why.

-- ----------------------------------------------------------------------------
-- 1. submit_manual_entry_request (CASHIER)
--    Writes a draft only. Nothing here affects revenue, stock, or reports.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_manual_entry_request(
  p_cashier_id      UUID,
  p_cashier_username TEXT,
  p_transaction_date DATE,
  p_items            JSONB,
  p_payment_method   TEXT,
  p_sold_by          TEXT    DEFAULT NULL,
  p_manual_ref       TEXT    DEFAULT NULL,
  p_atp_ref          TEXT    DEFAULT NULL,
  p_buyer_tin        TEXT    DEFAULT NULL,
  p_buyer_address    TEXT    DEFAULT NULL,
  p_customer_id      UUID    DEFAULT NULL,
  p_reference_number TEXT    DEFAULT NULL,
  p_term_due_date    DATE    DEFAULT NULL,
  p_amount_received  DECIMAL DEFAULT NULL,
  p_change_amount    DECIMAL DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id       UUID;
  v_total    NUMERIC := 0;
  v_item     JSONB;
  v_ref      TEXT;
  v_rec      RECORD;
BEGIN
  -- The cashier id is client-asserted and forgeable in this architecture, so
  -- this function deliberately does NOT trust it for anything privileged. It
  -- is stored for attribution only; all authority is enforced at review time.
  IF p_cashier_id IS NULL THEN
    RAISE EXCEPTION 'Cashier information is required';
  END IF;

  SELECT * INTO v_rec FROM public.cashiers WHERE id = p_cashier_id;
  -- IS NOT TRUE rather than `= false`: cashiers.is_active is nullable
  -- (BOOLEAN DEFAULT TRUE, no NOT NULL), and a NULL would make
  -- `IF NULL THEN` fall through, letting a NULL-flagged cashier submit.
  IF NOT FOUND OR v_rec.is_active IS NOT TRUE OR v_rec.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cashier account is not active';
  END IF;

  IF p_transaction_date IS NULL OR p_transaction_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Receipt date cannot be in the future';
  END IF;

  IF p_transaction_date < (CURRENT_DATE - INTERVAL '5 years') THEN
    RAISE EXCEPTION 'Receipt date is more than 5 years old. Check the date, or record this in the prior period manually.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  IF p_payment_method IS NULL OR btrim(p_payment_method) = '' THEN
    RAISE EXCEPTION 'A payment method is required';
  END IF;

  v_ref := NULLIF(btrim(COALESCE(p_manual_ref, '')), '');

  -- Reject a serial already consumed by an approved entry.
  IF v_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.transactions
     WHERE source = 'manual' AND manual_ref = v_ref
  ) THEN
    RAISE EXCEPTION 'BIR serial % has already been entered', v_ref;
  END IF;

  -- Reject a serial another pending request already claims.
  IF v_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.manual_entry_requests
     WHERE status = 'pending' AND manual_ref = v_ref
  ) THEN
    RAISE EXCEPTION 'BIR serial % is already awaiting approval', v_ref;
  END IF;

  -- Recompute the total server-side. The client's number is never trusted.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item->>'quantity')::NUMERIC, 0) <= 0 THEN
      RAISE EXCEPTION 'Every line item needs a quantity greater than zero';
    END IF;
    IF COALESCE((v_item->>'price')::NUMERIC, 0) < 0 THEN
      RAISE EXCEPTION 'Line item prices cannot be negative';
    END IF;
    v_total := v_total
      + COALESCE((v_item->>'quantity')::NUMERIC, 0)
      * COALESCE((v_item->>'price')::NUMERIC, 0);
  END LOOP;

  v_total := round(v_total, 2);

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total amount must be greater than zero';
  END IF;

  INSERT INTO public.manual_entry_requests (
    source_cashier_id, source_cashier_name, transaction_date, sold_by,
    manual_ref, atp_ref, buyer_tin, buyer_address, customer_id,
    payment_method, reference_number, term_due_date,
    amount_received, change_amount, notes, items, computed_total
  ) VALUES (
    p_cashier_id, p_cashier_username, p_transaction_date,
    NULLIF(btrim(COALESCE(p_sold_by, '')), ''),
    v_ref,
    NULLIF(btrim(COALESCE(p_atp_ref, '')), ''),
    NULLIF(btrim(COALESCE(p_buyer_tin, '')), ''),
    NULLIF(btrim(COALESCE(p_buyer_address, '')), ''),
    p_customer_id,
    p_payment_method,
    NULLIF(btrim(COALESCE(p_reference_number, '')), ''),
    p_term_due_date,
    p_amount_received,
    p_change_amount,
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_items,
    v_total
  )
  RETURNING id INTO v_id;

  INSERT INTO public.activity_logs (user_id, actor_cashier_id, actor_role, action, description, metadata)
  VALUES (
    NULL, p_cashier_id, 'cashier', 'manual_entry_submitted',
    format('Submitted manual BIR entry %s (%s) for %s', COALESCE(v_ref, 'no serial'), v_id, COALESCE(p_cashier_username, 'unknown')),
    jsonb_build_object('request_id', v_id, 'total', v_total, 'cashier_id', p_cashier_id)
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'status', 'pending',
    'computed_total', v_total
  );
END;
$$;

COMMENT ON FUNCTION public.submit_manual_entry_request IS
  'Cashier-submits a BIR manual sales book entry as a draft for admin review. Writes nothing to transactions, so it cannot affect revenue, stock, or reports.';

-- ----------------------------------------------------------------------------
-- 2. review_manual_entry_request (ADMIN) - batch capable
--    Takes an array so the admin can clear a stack of receipts in one pass.
--    Per-request failures are captured and reported rather than aborting the
--    whole batch, so one bad serial does not block the other nine.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_manual_entry_request(
  p_request_ids UUID[],
  p_approve     BOOLEAN,
  p_note        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin   UUID := auth.uid();
  r         RECORD;
  v_item    JSONB;
  v_tx_id   UUID;
  v_total   NUMERIC := 0;
  v_result  JSONB;
  v_results JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Admin role required to review manual entries';
  END IF;

  IF p_request_ids IS NULL OR array_length(p_request_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No requests selected';
  END IF;

  IF NOT p_approve AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'A reason is required when rejecting a request';
  END IF;

  FOR r IN
    SELECT * FROM public.manual_entry_requests
     WHERE id = ANY(p_request_ids) AND status = 'pending'
     ORDER BY created_at
  LOOP
    BEGIN
      IF NOT p_approve THEN
        UPDATE public.manual_entry_requests
           SET status      = 'rejected',
               reviewed_at = now(),
               reviewed_by = v_admin,
               review_note = p_note
         WHERE id = r.id;

        v_result := jsonb_build_object(
          'request_id', r.id, 'status', 'rejected', 'message', 'Request rejected'
        );
      ELSE
        -- ---------------- approve ----------------
        IF r.manual_ref IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.transactions
           WHERE source = 'manual' AND manual_ref = r.manual_ref
        ) THEN
          RAISE EXCEPTION 'BIR serial % is already used by an approved entry', r.manual_ref;
        END IF;

        v_total := 0;
        FOR v_item IN SELECT * FROM jsonb_array_elements(r.items)
        LOOP
          v_total := v_total
            + COALESCE((v_item->>'quantity')::NUMERIC, 0)
            * COALESCE((v_item->>'price')::NUMERIC, 0);
        END LOOP;
        v_total := round(v_total, 2);

        IF v_total <= 0 THEN
          RAISE EXCEPTION 'Total amount must be greater than zero';
        END IF;

        INSERT INTO public.transactions (
          source, transaction_date, total_amount, payment_method,
          reference_number, customer_id, status,
          discount_type, discount_value, discount_amount,
          recorded_by_cashier_id, approved_by, sold_by,
          manual_ref, atp_ref, buyer_tin, buyer_address,
          amount_received, change_amount, notes,
          down_payment, term_remaining_balance, term_due_date, term_status
        ) VALUES (
          'manual', r.transaction_date, v_total, r.payment_method,
          r.reference_number, r.customer_id, 'completed',
          NULL, 0, 0,
          r.source_cashier_id, v_admin, r.sold_by,
          r.manual_ref, r.atp_ref, r.buyer_tin, r.buyer_address,
          r.amount_received, r.change_amount, r.notes,
          0,
          CASE WHEN r.payment_method = 'term' THEN v_total ELSE 0 END,
          CASE WHEN r.payment_method = 'term' THEN r.term_due_date ELSE NULL END,
          CASE WHEN r.payment_method = 'term' THEN 'pending' ELSE NULL END
        )
        RETURNING id INTO v_tx_id;

        -- Stock is deducted here by the existing tr_deduct_stock_on_insert
        -- trigger, in the same transaction as the revenue row. Free-text lines
        -- carry a NULL product_id, so the trigger's UPDATE matches zero rows
        -- and they correctly move no inventory.
        FOR v_item IN SELECT * FROM jsonb_array_elements(r.items)
        LOOP
          INSERT INTO public.transaction_items (
            transaction_id, product_id, item_name, quantity, price
          ) VALUES (
            v_tx_id,
            NULLIF(btrim(COALESCE(v_item->>'product_id', '')), '')::UUID,
            COALESCE(NULLIF(btrim(COALESCE(v_item->>'description', '')), ''), 'Item'),
            GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 0), 1),
            COALESCE((v_item->>'price')::NUMERIC, 0)
          );
        END LOOP;

        UPDATE public.manual_entry_requests
           SET status                  = 'approved',
               reviewed_at             = now(),
               reviewed_by             = v_admin,
               review_note             = p_note,
               resulting_transaction_id = v_tx_id
         WHERE id = r.id;

        v_result := jsonb_build_object(
          'request_id', r.id, 'status', 'approved',
          'transaction_id', v_tx_id, 'total', v_total
        );
      END IF;

      v_results := v_results || jsonb_build_array(v_result);

    EXCEPTION WHEN OTHERS THEN
      -- Isolate the failure so the rest of the batch still processes.
      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'request_id', r.id, 'status', 'failed', 'message', SQLERRM
        )
      );
    END;
  END LOOP;

  INSERT INTO public.activity_logs (user_id, actor_role, action, description, metadata)
  VALUES (
    v_admin, 'admin',
    CASE WHEN p_approve THEN 'manual_entry_approved' ELSE 'manual_entry_rejected' END,
    format('%s %s manual entr%s',
           CASE WHEN p_approve THEN 'Approved' ELSE 'Rejected' END,
           array_length(p_request_ids, 1),
           CASE WHEN array_length(p_request_ids, 1) = 1 THEN 'y' ELSE 'ies' END),
    jsonb_build_object('request_ids', p_request_ids, 'note', p_note, 'results', v_results)
  );

  RETURN jsonb_build_object('results', v_results);
END;
$$;

COMMENT ON FUNCTION public.review_manual_entry_request IS
  'Admin reviews cashier-submitted manual entries in batch. On approve it creates the transaction and line items, deducting stock via the existing trigger. Drafts never counted toward revenue before this runs.';

-- ----------------------------------------------------------------------------
-- 3. void_manual_transaction (ADMIN)
--    Marks voided. Never deletes: a BIR serial is permanently consumed, and
--    the unique index on transactions.manual_ref must keep holding.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_manual_transaction(
  p_transaction_id UUID,
  p_reason         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_tx    public.transactions%ROWTYPE;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Admin role required to void a manual entry';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to void a manual entry';
  END IF;

  SELECT * INTO v_tx
    FROM public.transactions
   WHERE id = p_transaction_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.source <> 'manual' THEN
    RAISE EXCEPTION 'Only manual entries can be voided here. Use the register void flow instead.';
  END IF;

  IF v_tx.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'This entry has already been voided';
  END IF;

  -- Restore stock set-based, one UPDATE per product instead of a per-row loop.
  -- NULL product_id lines are excluded: they never deducted anything, so they
  -- must not restore anything.
  UPDATE public.products p
     SET stock_quantity = p.stock_quantity + agg.qty
    FROM (
      SELECT product_id, SUM(quantity) AS qty
        FROM public.transaction_items
       WHERE transaction_id = p_transaction_id
         AND product_id IS NOT NULL
       GROUP BY product_id
    ) agg
   WHERE p.id = agg.product_id;

  UPDATE public.transactions
     SET voided_at   = now(),
         voided_by   = v_admin,
         void_reason = p_reason
   WHERE id = p_transaction_id;

  INSERT INTO public.activity_logs (user_id, actor_role, action, description, metadata)
  VALUES (
    v_admin, 'admin', 'manual_entry_voided',
    format('Voided manual BIR entry %s (%s)', COALESCE(v_tx.manual_ref, 'no serial'), v_tx.id),
    jsonb_build_object('transaction_id', p_transaction_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', p_transaction_id,
    'manual_ref', v_tx.manual_ref
  );
END;
$$;

COMMENT ON FUNCTION public.void_manual_transaction IS
  'Voids an approved manual entry, restoring stock. Marks the row voided rather than deleting it, so BIR serials stay permanently consumed.';

-- ----------------------------------------------------------------------------
-- Grants
--
-- Cashiers sign in against the custom `cashiers` table and never hold a Supabase
-- Auth session, so their browser only ever carries the `anon` key. The
-- draft-submission path therefore has to be reachable by `anon` or the MANUAL
-- button is dead on arrival. This is not a widening of privilege beyond the
-- existing model (transactions/transaction_items already accept anonymous
-- inserts via `WITH CHECK (true)` policies) and the function is strictly
-- narrower: it only ever writes a DRAFT into manual_entry_requests, and it is
-- SECURITY DEFINER so it does not need any table grants for anon.
--
-- The review and void paths stay admin-only and remain `authenticated` +
-- is_active_admin() gated.
-- ----------------------------------------------------------------------------
-- EXECUTE grants for the four functions above live in
-- add_manual_entry_grants.sql.

-- A rejected request must be correctable in place so its BIR serial stays
-- reserved across the edit. Without this the cashier could only create a new
-- row, which would let two requests compete for the same serial.
CREATE OR REPLACE FUNCTION public.resubmit_manual_entry_request(
  p_request_id          UUID,
  p_transaction_date    DATE,
  p_items               JSONB,
  p_manual_ref          TEXT DEFAULT NULL,
  p_atp_ref             TEXT DEFAULT NULL,
  p_customer_id         UUID DEFAULT NULL,
  p_buyer_tin           TEXT DEFAULT NULL,
  p_buyer_address       TEXT DEFAULT NULL,
  p_sold_by             TEXT DEFAULT NULL,
  p_payment_method      TEXT DEFAULT NULL,
  p_reference_number    TEXT DEFAULT NULL,
  p_term_due_date       DATE DEFAULT NULL,
  p_amount_received     DECIMAL DEFAULT NULL,
  p_change_amount       DECIMAL DEFAULT NULL,
  p_notes               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_total    NUMERIC := 0;
  v_item     JSONB;
  v_ref      TEXT;
BEGIN
  SELECT * INTO v_existing FROM public.manual_entry_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_existing.status <> 'rejected' THEN
    RAISE EXCEPTION 'Only a rejected entry can be edited. Pending entries are already in the admin queue.';
  END IF;

  IF p_transaction_date IS NULL OR p_transaction_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Receipt date cannot be in the future';
  END IF;

  IF p_transaction_date < (CURRENT_DATE - INTERVAL '5 years') THEN
    RAISE EXCEPTION 'Receipt date is more than 5 years old. Check the date, or record this in the prior period manually.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(btrim(v_item->>'description'), '') = '' THEN
      RAISE EXCEPTION 'Every line item needs a description';
    END IF;
    IF COALESCE((v_item->>'quantity')::NUMERIC, 0) <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero on every line';
    END IF;
    IF COALESCE((v_item->>'price')::NUMERIC, 0) < 0 THEN
      RAISE EXCEPTION 'Price cannot be negative on any line';
    END IF;
    v_total := v_total
      + COALESCE((v_item->>'quantity')::NUMERIC, 0) * COALESCE((v_item->>'price')::NUMERIC, 0);
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total must be greater than zero';
  END IF;

  IF COALESCE(btrim(p_payment_method), '') = '' THEN
    RAISE EXCEPTION 'Payment method is required';
  END IF;

  IF p_payment_method = 'term' AND p_term_due_date IS NULL THEN
    RAISE EXCEPTION 'Term sales need a due date';
  END IF;

  -- Same serial rules as first submission: a serial cannot already be sitting in
  -- `transactions` (which includes voided rows, so a voided serial stays burned).
  IF NULLIF(btrim(p_manual_ref), '') IS NOT NULL THEN
    v_ref := btrim(p_manual_ref);
    IF EXISTS (SELECT 1 FROM public.transactions WHERE manual_ref = v_ref) THEN
      RAISE EXCEPTION 'BIR serial % has already been recorded or voided', v_ref;
    END IF;
    -- ux_mer_pending_manual_ref is UNIQUE across pending rows, so if another
    -- pending request already claims this serial the UPDATE below would abort
    -- with a raw constraint violation. Check first and explain instead. This row
    -- is excluded because it is the one being re-queued.
    IF EXISTS (
      SELECT 1 FROM public.manual_entry_requests
       WHERE status = 'pending' AND manual_ref = v_ref AND id <> p_request_id
    ) THEN
      RAISE EXCEPTION 'BIR serial % is already awaiting approval on another request', v_ref;
    END IF;
  ELSE
    v_ref := NULL;
  END IF;

  UPDATE public.manual_entry_requests
     SET transaction_date = p_transaction_date,
         items            = p_items,
         manual_ref       = v_ref,
         atp_ref          = p_atp_ref,
         customer_id      = p_customer_id,
         buyer_tin        = p_buyer_tin,
         buyer_address    = p_buyer_address,
         sold_by          = p_sold_by,
         payment_method   = p_payment_method,
         reference_number = p_reference_number,
         term_due_date    = p_term_due_date,
         amount_received  = p_amount_received,
         change_amount    = p_change_amount,
         notes            = p_notes,
         computed_total   = v_total,
         status           = 'pending',
         review_note      = NULL,
         reviewed_by      = NULL,
         reviewed_at      = NULL
   WHERE id = p_request_id;

  -- activity_logs has no table_name/record_id columns in this schema, so the
  -- request id travels in metadata instead.
  INSERT INTO public.activity_logs (user_id, actor_cashier_id, actor_role, action, description, metadata)
  VALUES (
    NULL,
    v_existing.source_cashier_id,
    'cashier',
    'manual_entry_resubmitted',
    'Cashier resubmitted BIR manual entry ' || COALESCE(v_ref, '(no serial)'),
    jsonb_build_object('total', v_total, 'request_id', p_request_id)
  );

  RETURN jsonb_build_object('id', p_request_id, 'status', 'pending', 'total', v_total);
END;
$$;

COMMENT ON FUNCTION public.resubmit_manual_entry_request IS
  'Re-queues a rejected manual entry as pending in place, keeping its row and reserved BIR serial.';

-- EXECUTE grant lives in add_manual_entry_grants.sql. It used to be written out
-- here with only 14 argument types instead of this function's 15, which failed
-- with 42883 and rolled back every function in this file.

-- ############################################################################
-- SOURCE: supabase/create_term_payments_table.sql
-- ############################################################################
-- Create term_payments table for recording incoming term payments
CREATE TABLE IF NOT EXISTS term_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  cashier_id UUID REFERENCES cashiers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create term_payment_allocations table (FIFO tracking)
CREATE TABLE IF NOT EXISTS term_payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term_payment_id UUID NOT NULL REFERENCES term_payments(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_term_payments_customer ON term_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_term_payments_cashier ON term_payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_term_payment_allocations_payment ON term_payment_allocations(term_payment_id);
CREATE INDEX IF NOT EXISTS idx_term_payment_allocations_tx ON term_payment_allocations(transaction_id);

-- RLS
ALTER TABLE term_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON term_payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON term_payment_allocations
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE term_payments IS 'Records incoming payments against term/installment transactions';
COMMENT ON TABLE term_payment_allocations IS 'FIFO allocation of term payments to individual transactions';

-- ############################################################################
-- SOURCE: supabase/add_term_payment_to_transactions.sql
-- ############################################################################
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

-- ############################################################################
-- SOURCE: supabase/add_term_paid_amount.sql
-- ############################################################################
-- Add term_paid_amount to transactions for tracking partial term payments
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS term_paid_amount DECIMAL(10,2) DEFAULT 0;

-- Update payment_method check to include term_payment
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'mobile', 'cheque', 'term', 'term_payment'));

COMMENT ON COLUMN transactions.term_paid_amount IS 'Amount already paid toward this term transaction (FIFO)';

-- ############################################################################
-- SOURCE: supabase/add_term_paid_amount_function.sql
-- ############################################################################
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

-- ############################################################################
-- SOURCE: supabase/add_customer_balance_override_updated_at.sql
-- ############################################################################
-- Migration: dedicated timestamp for when balance_override was last set, so an
-- unlinked manual balance can age and surface as overdue (60-day grace in the
-- Term Accounts roster) instead of being permanently "Active".
--
-- Run BEFORE re-running add_record_term_payment_function.sql, which now touches
-- this column in its UPDATE.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_override_updated_at TIMESTAMPTZ;

-- Backfill with the best-known timestamp for legacy rows. POS always sets
-- updated_at on customer edits, so it is the closest prior record of when a
-- manual balance was entered.
UPDATE customers
SET balance_override_updated_at = updated_at
WHERE balance_override_updated_at IS NULL
  AND COALESCE(balance_override, 0) > 0;

-- ############################################################################
-- SOURCE: supabase/add_term_account_admin_only.sql
-- ############################################################################
-- Term account permissions: cashiers may RECORD, only admins may EDIT.
--
-- Background
-- ----------
-- Cashiers hold the Supabase anon key with no Auth session (auth.uid() is NULL),
-- so they were relying on the blanket policies in create_term_payments_table.sql:
--
--   CREATE POLICY "Allow all operations for authenticated users" ON term_payments
--     FOR ALL USING (true) WITH CHECK (true);
--
-- `FOR ALL USING (true)` granted UPDATE and DELETE to anon as well, which is how
-- a cashier could undo a term payment or rewrite an allocation. This migration
-- narrows that: SELECT is open to everyone for the read-only account pages and
-- register balances, every mutation is admin-only, and cashier recording happens
-- exclusively through the SECURITY DEFINER record_term_payment() RPC, which
-- writes the audit row. A cashier thus cannot write a payment unattributed.
--
-- is_active_admin() is the shared helper from add_manual_entry_functions.sql. It
-- already returns false when auth.uid() IS NULL, so a cashier can never satisfy
-- it.
--
-- Run this AFTER create_term_payments_table.sql and
-- add_manual_entry_functions.sql (for is_active_admin).

-- ----------------------------------------------------------------------------
-- 1. Term payments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON term_payments;

-- Cashiers read the running balance when recording a payment, and admins need to
-- see every payment for the Term Accounts page. Read stays open to both.
DROP POLICY IF EXISTS "Read term payments" ON term_payments;
CREATE POLICY "Read term payments" ON term_payments
  FOR SELECT USING (true);

-- Recording is done through record_term_payment() (SECURITY DEFINER), which owns
-- its own insert privileges and writes the audit row. Direct PostgREST inserts
-- are therefore reserved for admins; a cashier always has to go through the
-- RPC, so every payment they record is attributable.
DROP POLICY IF EXISTS "Insert term payments" ON term_payments;
CREATE POLICY "Admins insert term payments" ON term_payments
  FOR INSERT WITH CHECK (public.is_active_admin());

-- Editing or deleting an existing payment is an admin action. A cashier hitting
-- these now gets a permission error rather than silently succeeding.
DROP POLICY IF EXISTS "Admins update term payments" ON term_payments;
CREATE POLICY "Admins update term payments" ON term_payments
  FOR UPDATE USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins delete term payments" ON term_payments;
CREATE POLICY "Admins delete term payments" ON term_payments
  FOR DELETE USING (public.is_active_admin());

-- ----------------------------------------------------------------------------
-- 2. FIFO allocations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON term_payment_allocations;

DROP POLICY IF EXISTS "Read term payment allocations" ON term_payment_allocations;
CREATE POLICY "Read term payment allocations" ON term_payment_allocations
  FOR SELECT USING (true);

-- Allocations are written by record_term_payment() server-side. Direct inserts
-- are admin-only for the same reason as term_payments.
DROP POLICY IF EXISTS "Insert term payment allocations" ON term_payment_allocations;
CREATE POLICY "Admins insert term payment allocations" ON term_payment_allocations
  FOR INSERT WITH CHECK (public.is_active_admin());

-- Rewriting a settled allocation would move money between already-received
-- payments, so it is admin-only.
DROP POLICY IF EXISTS "Admins update term payment allocations" ON term_payment_allocations;
CREATE POLICY "Admins update term payment allocations" ON term_payment_allocations
  FOR UPDATE USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins delete term payment allocations" ON term_payment_allocations;
CREATE POLICY "Admins delete term payment allocations" ON term_payment_allocations
  FOR DELETE USING (public.is_active_admin());

-- ----------------------------------------------------------------------------
-- 3. Undo a term payment: admin only
-- ----------------------------------------------------------------------------
-- undo_term_payment is SECURITY DEFINER, and Postgres grants EXECUTE to PUBLIC by
-- default on every function. Granting it only to `authenticated` in
-- add_term_payment_admin_grant.sql therefore did NOT stop a cashier holding the
-- anon key: PUBLIC still covered them. Revoke from PUBLIC and anon first, then
-- grant to authenticated explicitly.
REVOKE EXECUTE ON FUNCTION public.undo_term_payment(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.undo_term_payment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.undo_term_payment(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Audit trail for cashier term activity
-- ----------------------------------------------------------------------------
-- Audit rows are written by record_term_payment()/undo_term_payment() as
-- SECURITY DEFINER, so they need no anon table grant at all. An earlier draft of
-- this file granted `INSERT` to anon with a policy letting anon write rows that
-- merely claim to name a cashier; that let any cashier forge arbitrary entries
-- (blame a coworker, invent actions, pad the admin trail), which defeats the
-- whole point of the audit. Do NOT re-add it: the RPCs attribute correctly and
-- the table owner bypasses RLS for their inserts.
--
-- The only client-side writer is the admin portal (logActivity), which supplies
-- a real Supabase user.id; it is covered by the policy below.
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;
CREATE POLICY "Users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Cashiers can write attributed activity logs" ON activity_logs;

-- Admins read the trail from the Term Accounts audit tab; the RLS on
-- activity_logs (Admins can view all activity logs) already covers the
-- authenticated admin role, so no grant is added for SELECT here.

-- ############################################################################
-- SOURCE: supabase/add_record_term_payment_function.sql
-- ############################################################################
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
  v_alloc      JSONB;
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

-- ############################################################################
-- SOURCE: supabase/add_undo_term_payment_function.sql
-- ############################################################################
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

-- ############################################################################
-- SOURCE: supabase/add_term_payment_admin_grant.sql
-- ############################################################################
-- Explicit grants so the admin portal (authenticated role) can record and undo
-- term payments from the Down Payments section of the Reports page.
-- These RPCs are SECURITY DEFINER (bypass RLS); granting EXECUTE to
-- authenticated is safe, matching the pattern in add_manual_entry_grants.sql.
-- Without these, execution relies on Postgres' default PUBLIC EXECUTE grant.

GRANT EXECUTE ON FUNCTION public.update_transaction_term_paid_amount(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_term_payment(UUID) TO authenticated;

-- Reload PostgREST so the new function is routable immediately.
NOTIFY pgrst, 'reload schema';
