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
