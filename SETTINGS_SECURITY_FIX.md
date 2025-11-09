# Settings Table Security Fix

## Overview
This document describes the security fix applied to the settings table in the Supabase database to remove unrestricted access and enforce proper role-based access control.

## Problem
The settings table previously had no Row Level Security (RLS) policies, which meant that any authenticated user could potentially:
- View sensitive store settings
- Modify store configuration
- Delete settings data

This created a security vulnerability in the application.

## Solution
The following changes were implemented:

1. **Enabled RLS on the settings table**
2. **Created restrictive policies allowing only admin users to access the settings table**
3. **Updated the main security policies file to include settings table policies**
4. **Provided optional enforcement for single settings row**

## Files Created/Modified

### 1. `supabase/restrict_settings_access.sql`
A standalone script that can be run to apply the security fixes to the settings table:
- Enables RLS on the settings table
- Creates policies restricting access to admin users only
- Grants necessary permissions
- Includes optional function to ensure only one settings row exists

### 2. `supabase/security_policies.sql` (modified)
Updated the main security policies file to include policies for the settings table:
- Added `ALTER TABLE settings ENABLE ROW LEVEL SECURITY;`
- Added policies for SELECT, INSERT, UPDATE, and DELETE operations
- Only users with role='admin' in the public.users table can access settings

### 3. `supabase/verify_settings_policies.sql`
A verification script to check that the policies are correctly applied:
- Checks that RLS is enabled on the settings table
- Lists existing policies on the settings table

## Policies Implemented

### Select Policy
Only admin users can view settings:
```sql
CREATE POLICY "Admins can view settings" ON settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );
```

### Insert Policy
Only admin users can insert settings:
```sql
CREATE POLICY "Admins can insert settings" ON settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );
```

### Update Policy
Only admin users can update settings:
```sql
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
```

### Delete Policy
Only admin users can delete settings:
```sql
CREATE POLICY "Admins can delete settings" ON settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );
```

## How to Apply the Fix

1. Run the `supabase/restrict_settings_access.sql` script in your Supabase SQL editor
2. OR run the updated `supabase/security_policies.sql` script if you want to apply all policies at once

## Verification

After applying the fix, you can verify that the policies are working by:

1. Running the `supabase/verify_settings_policies.sql` script
2. Testing access through your application with different user roles
3. Confirming that only admin users can access the settings functionality

## Optional: Single Settings Row Enforcement

The `restrict_settings_access.sql` script includes an optional function and trigger to ensure that only one settings row exists in the table. This is commented out by default but can be enabled if needed.

To enable this feature, uncomment the trigger creation code in the script:

```sql
-- Uncomment the following lines if you want to enforce only one settings row
/*
DROP TRIGGER IF EXISTS enforce_single_settings_row ON settings;
CREATE TRIGGER enforce_single_settings_row
  BEFORE INSERT OR UPDATE OR DELETE ON settings
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_settings_row();
*/
```

## Impact

After applying these changes:
- Only users with the 'admin' role can access the settings table
- Cashier users and other non-admin users will be blocked from viewing or modifying settings
- The application's security posture is significantly improved