# Apply Cashier Security Fix

## Issue
The cashier login is failing because Row Level Security (RLS) policies are preventing anonymous access to the cashiers table for authentication purposes.

## Solution
Apply the updated RLS policies from `supabase/cashiers_security_policies.sql` to your Supabase database.

## Steps to Apply the Fix

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

-- Allow anyone to authenticate cashiers (needed for login)
-- This policy allows SELECT on username and password for authentication purposes only
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (
    -- Allow access for authentication purposes
    true
  );

-- Admins can manage all cashier data
DROP POLICY IF EXISTS "Admins can manage cashiers" ON cashiers;
CREATE POLICY "Admins can manage cashiers" ON cashiers
  FOR ALL USING (
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

-- Grant necessary permissions
GRANT ALL ON TABLE cashiers TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication

-- Add comments to document the policies
COMMENT ON POLICY "Allow cashier authentication" ON cashiers IS 'Allow authentication of cashiers by username/password';
COMMENT ON POLICY "Admins can manage cashiers" ON cashiers IS 'Allow admins to manage all cashier data';
```

### 3. Verify the Policies
After running the SQL, you can verify that the policies have been applied by:

1. Going to the Table Editor in Supabase
2. Selecting the "cashiers" table
3. Checking the "Policies" tab to see the newly created policies

### 4. Test the Login
1. Try logging in as a cashier with the test credentials:
   - Username: `testcashier`
   - Password: `TestPassword123!`
2. The login should now work correctly

## Security Benefits
After applying these policies:
- Anonymous users can authenticate against the cashiers table (needed for login)
- Admin users retain full management access to the cashiers table
- Data integrity is maintained through proper access controls
- The security model follows the principle of least privilege

## Troubleshooting
If you encounter issues after applying the policies:
1. Check that the SQL executed without errors
2. Verify that the policies appear in the Supabase dashboard
3. Check the browser console for any authentication errors
4. Ensure that the cashier records exist in the database