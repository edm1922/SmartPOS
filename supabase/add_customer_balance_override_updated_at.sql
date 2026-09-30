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