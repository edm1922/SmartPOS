# Fixed Auth Permissions for Cashier Creation

## Issue

The cashier creation feature was failing with a "User not allowed" error when trying to use `supabase.auth.admin.createUser()`. This was because the regular Supabase client doesn't have admin privileges to create users via the admin API.

## Solution

Instead of using the admin API which requires special permissions, we've modified the implementation to use `supabase.auth.signUp()` which:

1. Doesn't require admin privileges
2. Automatically triggers the existing `handle_new_user` function
3. Creates the user in both the auth system and the public.users table

## Changes Made

### File: src/app/admin/cashiers/page.tsx

Modified the `onSubmit` function to use `signUp` instead of `admin.createUser`:

```typescript
// Before (causing the error):
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: fakeEmail,
  password: password,
  email_confirm: true,
});

// After (working solution):
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: fakeEmail,
  password: password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/cashier/login`,
  }
});
```

### Additional Updates

1. Added a small delay to allow the trigger function to run before updating the username
2. Added a follow-up update to ensure the username field is properly set in the database

## How It Works

1. Admin enters username and optionally a password in the cashier creation form
2. System generates a secure password if none is provided
3. System creates a fake email in the format `username@pos-system.local`
4. System calls `supabase.auth.signUp()` which:
   - Creates the user in the auth system
   - Triggers the `handle_new_user` function
   - Automatically creates a record in the public.users table
5. System updates the user record to ensure the username field is set correctly

## Security Considerations

This approach maintains the same security level as the previous implementation:
- Users are still created with secure passwords
- The trigger function ensures proper user creation in the public.users table
- Admins still have full control over user management
- RLS policies remain unchanged

## Testing

To test this fix:
1. Navigate to the Cashier Management page
2. Click "Add Cashier"
3. Enter a unique username
4. Leave password blank to use auto-generated password, or enter a custom password
5. Click "Add Cashier"
6. Verify the cashier is created successfully without errors

The cashier should now be able to log in using either their username or the fake email address.