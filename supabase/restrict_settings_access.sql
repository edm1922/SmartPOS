-- Script to restrict access to the settings table to admin users only
-- This removes unrestricted access and enforces proper security

-- First, enable RLS on the settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies on the settings table
DROP POLICY IF EXISTS "Admins can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;

-- Create policy to allow admins to view settings
CREATE POLICY "Admins can view settings" ON settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Create policy to allow admins to insert settings (though there should only be one row)
CREATE POLICY "Admins can insert settings" ON settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Create policy to allow admins to update settings
CREATE POLICY "Admins can update settings" ON settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Create policy to allow admins to delete settings (though this should rarely be used)
CREATE POLICY "Admins can delete settings" ON settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Grant necessary permissions to authenticated users
GRANT ALL ON TABLE settings TO authenticated;

-- Ensure only one settings row exists (optional but recommended)
-- This function ensures we don't accidentally create multiple settings rows
CREATE OR REPLACE FUNCTION public.ensure_single_settings_row()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an insert and there's already a row, prevent it
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM settings) THEN
      RAISE EXCEPTION 'Only one settings row is allowed';
    END IF;
    RETURN NEW;
  END IF;
  
  -- If this is an update, allow it
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- If this is a delete, prevent it unless it's the last row
  IF TG_OP = 'DELETE' THEN
    IF (SELECT COUNT(*) FROM settings) = 1 THEN
      RAISE EXCEPTION 'Cannot delete the last settings row';
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single settings row (optional)
-- Uncomment the following lines if you want to enforce only one settings row
/*
DROP TRIGGER IF EXISTS enforce_single_settings_row ON settings;
CREATE TRIGGER enforce_single_settings_row
  BEFORE INSERT OR UPDATE OR DELETE ON settings
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_settings_row();
*/