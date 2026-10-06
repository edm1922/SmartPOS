-- Distinguish customers created via the Add/Edit Customer form (manual)
-- from those auto-created by checkout/entry flows (discount name, Sold By).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;

-- Backfill: only the customer form stamps balance_override_updated_at, so that's
-- a reliable fingerprint of a manually entered record.
UPDATE customers SET is_manual = true WHERE is_manual = false AND balance_override_updated_at IS NOT NULL;