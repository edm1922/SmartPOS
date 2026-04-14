-- Script to update all product prices to be VAT inclusive
-- This reads the current tax_rate from your settings table and inflates your product prices accordingly.

DO $$ 
DECLARE
  current_tax_rate DECIMAL;
  multiplier DECIMAL;
BEGIN
  -- 1. Get the current tax rate globally from settings
  SELECT tax_rate INTO current_tax_rate FROM settings LIMIT 1;
  
  -- 2. Prevent division or multiplication by zero
  IF current_tax_rate IS NULL OR current_tax_rate <= 0 THEN
      RAISE NOTICE 'VAT rate is 0 or not found in settings. No product prices were updated.';
      RETURN;
  END IF;

  -- 3. Calculate the multiplier (e.g., 12% becomes 1.12)
  multiplier := 1 + (current_tax_rate / 100.0);
  
  -- 4. Update all active product prices (Rounds to 2 decimal places)
  UPDATE products 
  SET price = ROUND((price * multiplier)::numeric, 2)
  WHERE deleted_at IS NULL;

  RAISE NOTICE 'Successfully updated all products to be VAT inclusive! VAT applied: %%%. Multiplier: %', current_tax_rate, multiplier;
END $$;
