-- Cashiers table security policies

-- First, disable RLS on cashiers table to avoid conflicts
ALTER TABLE cashiers DISABLE ROW LEVEL SECURITY;

-- Then enable RLS on cashiers table
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to authenticate cashiers (needed for login)
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (true);

-- Allow admins to insert cashiers
DROP POLICY IF EXISTS "Admins can insert cashiers" ON cashiers;
CREATE POLICY "Admins can insert cashiers" ON cashiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update cashiers
DROP POLICY IF EXISTS "Admins can update cashiers" ON cashiers;
CREATE POLICY "Admins can update cashiers" ON cashiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete cashiers
DROP POLICY IF EXISTS "Admins can delete cashiers" ON cashiers;
CREATE POLICY "Admins can delete cashiers" ON cashiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow cashiers to view their own record (for profile management)
DROP POLICY IF EXISTS "Cashiers can view own record" ON cashiers;
CREATE POLICY "Cashiers can view own record" ON cashiers
  FOR SELECT USING (
    id = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON TABLE cashiers TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication

-- Add comments to document the policies
COMMENT ON POLICY "Allow cashier authentication" ON cashiers IS 'Allow authentication of cashiers by username/password';
COMMENT ON POLICY "Admins can insert cashiers" ON cashiers IS 'Allow admins to create new cashiers';
COMMENT ON POLICY "Admins can update cashiers" ON cashiers IS 'Allow admins to update cashier information';
COMMENT ON POLICY "Admins can delete cashiers" ON cashiers IS 'Allow admins to delete cashiers';
COMMENT ON POLICY "Cashiers can view own record" ON cashiers IS 'Allow cashiers to view their own profile information';