-- Migration to add soft delete support for products
-- This allows deleting products that are referenced by transaction history

ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the getProducts policy if necessary (actually RLS usually doesn't need to change for this, but the query does)
-- However, we can also add a policy that prevents selecting deleted products for non-admins if we want.
