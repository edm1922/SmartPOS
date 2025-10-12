# Supabase Auth Permissions Fix

## Issue Description

When implementing the username-based cashier creation feature, we encountered a "User not allowed" error when trying to use `supabase.auth.admin.createUser()`. This occurred because:

1. The regular Supabase client doesn't have admin privileges
2. Using the admin API requires a service role key which wasn't configured
3. Regular users (even admins) don't have permission to create users via the admin API

## Solution Implemented

Instead of using the admin API, we switched to using `supabase.auth.signUp()` which:

1. Doesn't require admin privileges
2. Is available to all authenticated users
3. Automatically triggers the existing `handle_new_user` database function
4. Creates the user in both the auth system and public.users table

## Technical Details

### Previous Implementation (Causing Error)
```typescript
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: fakeEmail,
  password: password,
  email_confirm: true,
});
```

### New Implementation (Working Solution)
```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: fakeEmail,
  password: password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/cashier/login`,
  }
});
```

## Additional Considerations

1. Added a small delay (`await new Promise(resolve => setTimeout(resolve, 1000))`) to ensure the trigger function completes before updating the username field
2. Added a follow-up update to ensure the username field is properly set in the database

## Benefits of This Approach

1. No additional configuration required (no service role key needed)
2. Leverages existing database triggers and functions
3. Maintains the same security model
4. Works with the current RLS policies
5. Simplifies the implementation by using standard Supabase Auth methods

## Testing

This fix has been tested and verified to work correctly:
1. Cashiers can be created successfully without permission errors
2. Auto-generated passwords work as expected
3. Usernames are properly stored in the database
4. Cashiers can log in using their usernames
5. All existing functionality remains intact

## Potential Alternative Solutions

If in the future you want to use the admin API approach, you would need to:

1. Obtain a service role key from your Supabase project settings
2. Create a separate Supabase client instance using the service role key
3. Use that client for admin operations only
4. Ensure the service role key is kept secure and not exposed in client-side code

However, the current solution using `signUp()` is simpler and more secure for this use case.