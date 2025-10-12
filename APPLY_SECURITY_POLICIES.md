# Apply Security Policies to Cashiers Table

## Issue
The cashiers table currently has no Row Level Security (RLS) policies, making it unrestricted and potentially insecure.

## Solution
Apply the RLS policies defined in `supabase/cashiers_security_policies.sql` to restrict access to the cashiers table.

## Steps to Apply Security Policies

### 1. Access Supabase Dashboard
1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor

### 2. Execute the Security Policies SQL
Copy and paste the contents of `supabase/cashiers_security_policies.sql` into the SQL Editor and run it:

```sql
-- Cashiers table security policies

-- First, disable RLS on cashiers table to avoid conflicts
ALTER TABLE cashiers DISABLE ROW LEVEL SECURITY;

-- Then enable RLS on cashiers table
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- Admins can view all cashiers
DROP POLICY IF EXISTS "Admins can view all cashiers" ON cashiers;
CREATE POLICY "Admins can view all cashiers" ON cashiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Admins can insert cashiers
DROP POLICY IF EXISTS "Admins can insert cashiers" ON cashiers;
CREATE POLICY "Admins can insert cashiers" ON cashiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Admins can update cashiers
DROP POLICY IF EXISTS "Admins can update cashiers" ON cashiers;
CREATE POLICY "Admins can update cashiers" ON cashiers
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

-- Admins can delete cashiers
DROP POLICY IF EXISTS "Admins can delete cashiers" ON cashiers;
CREATE POLICY "Admins can delete cashiers" ON cashiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON TABLE cashiers TO authenticated;

-- Add comments to document the policies
COMMENT ON POLICY "Admins can view all cashiers" ON cashiers IS 'Allow admins to view all cashiers';
COMMENT ON POLICY "Admins can insert cashiers" ON cashiers IS 'Allow admins to create new cashiers';
COMMENT ON POLICY "Admins can update cashiers" ON cashiers IS 'Allow admins to update cashier information';
COMMENT ON POLICY "Admins can delete cashiers" ON cashiers IS 'Allow admins to delete cashiers';
```

### 3. Verify the Policies
After running the SQL, you can verify that the policies have been applied by:

1. Going to the Table Editor in Supabase
2. Selecting the "cashiers" table
3. Checking the "Policies" tab to see the newly created policies

### 4. Test the Security
1. Try accessing the cashier management page as an admin - this should work
2. Try accessing the cashiers table directly without authentication - this should be denied

## Files Created
1. `supabase/cashiers_security_policies.sql` - Contains the RLS policies
2. `SECURITY_IMPLEMENTATION.md` - Documentation of the security implementation
3. `test_cashiers_security.js` - Script to test security (before applying policies)
4. `APPLY_SECURITY_POLICIES.md` - This instruction file

## Security Benefits
After applying these policies:
- Only authenticated admin users can access the cashiers table
- Different operations (SELECT, INSERT, UPDATE, DELETE) are properly restricted
- The security model is consistent with other tables in the system
- Data integrity is maintained through proper access controls

## Troubleshooting
If you encounter issues after applying the policies:
1. Check that the admin user has the correct role in the `users` table
2. Verify that the user is active (`is_active = true`)
3. Ensure that the RLS policies are correctly applied in the Supabase dashboard
4. Check the browser console for any authentication errors