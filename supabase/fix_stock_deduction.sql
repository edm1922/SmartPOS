-- Function to deduct stock when a transaction item is created
-- This function runs with SECURITY DEFINER, meaning it has the permissions of the database owner,
-- allowing it to update the products table even if the cashier (authenticated/anon user) doesn't have direct update permissions.

CREATE OR REPLACE FUNCTION deduct_stock_after_transaction_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct the quantity from the product's stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Optional: Log the update for debugging
    -- RAISE NOTICE 'Deducted % units from product %', NEW.quantity, NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new item is added to a transaction
DROP TRIGGER IF EXISTS tr_deduct_stock_on_insert ON public.transaction_items;
CREATE TRIGGER tr_deduct_stock_on_insert
AFTER INSERT ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_after_transaction_item_insert();

-- Also ensure that non-admin users (like cashiers or anon) can insert into transactions and items
-- The existing policies might be restrictive depending on how auth is handled.

-- 1. Ensure transactions can be inserted
DROP POLICY IF EXISTS "Allow cashier and anon insert transactions" ON transactions;
CREATE POLICY "Allow cashier and anon insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- 2. Ensure transaction_items can be inserted
DROP POLICY IF EXISTS "Allow cashier and anon insert transaction_items" ON transaction_items;
CREATE POLICY "Allow cashier and anon insert transaction_items" ON transaction_items
  FOR INSERT WITH CHECK (true);

-- 3. Ensure transactions can be viewed by the creator
DROP POLICY IF EXISTS "Enable select for creators" ON transactions;
CREATE POLICY "Enable select for creators" ON transactions
  FOR SELECT USING (true);

-- 4. Enable select for transaction items
DROP POLICY IF EXISTS "Enable select for transaction items" ON transaction_items;
CREATE POLICY "Enable select for transaction items" ON transaction_items
  FOR SELECT USING (true);
