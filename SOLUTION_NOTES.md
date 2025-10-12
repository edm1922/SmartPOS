# Solution Notes for RLS Recursion Issue

## Problem
The login process was getting stuck at "Signing in..." due to an infinite recursion error in the Row Level Security (RLS) policies for the users table. The error message was:
```
"infinite recursion detected in policy for relation 'users'"
```

## Root Cause
The issue was caused by the RLS policies on the users table that were checking the users table within their own policy definitions, creating a circular reference:
```sql
-- This creates recursion:
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
```

When trying to query the users table to check if the current user is an admin, it triggers the same policy, which again tries to query the users table, creating an infinite loop.

## Solution Implemented
1. **Updated Security Policies**: Modified the RLS policies to use `auth.jwt()` claims instead of querying the users table directly, which avoids the recursion issue.

2. **Enhanced Error Handling**: Updated the `getUserRole` function in the Supabase client to gracefully handle RLS errors and fall back to alternative methods.

3. **Maintained Demo Access**: Kept the existing functionality that allows demo access for users who exist in auth but not in the public users table.

## Long-term Recommendations

### 1. Use Supabase Auth Hooks
Set up auth hooks to automatically sync user roles from your public.users table to the user's JWT claims:

```sql
-- Create a function to set user role in JWT claims
CREATE OR REPLACE FUNCTION public.set_user_role_in_jwt()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would be called on user login to set the role in JWT claims
  -- Implementation would depend on your specific requirements
END;
$$;
```

### 2. Use Supabase Auth Triggers
Set up triggers to automatically create users in your public.users table when they sign up:

```sql
-- Create a trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'cashier'); -- Default role
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Implement Proper Role Management
Create a more robust role management system:

```sql
-- Add a function to safely check user roles
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'admin'
    -- Add LIMIT 1 to prevent potential issues
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Modified
1. `supabase/security_policies.sql` - Updated RLS policies to avoid recursion
2. `src/lib/supabaseClient.ts` - Enhanced error handling in getUserRole function

## Testing
After applying these changes, test the following scenarios:
1. Login with a user that exists in both auth.users and public.users
2. Login with a user that exists only in auth.users (demo access)
3. Login with invalid credentials
4. Attempt to access admin routes as a non-admin user