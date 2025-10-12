# Trigger Fix Troubleshooting Guide

## Issue
You're still getting "Database error saving new user" when trying to create cashiers.

## Solution
You need to run the updated trigger function in your Supabase database.

## Steps to Fix

### 1. Run the Fix Script
1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_trigger_function.sql`:
   ```sql
   -- Drop the existing trigger
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

   -- Recreate the trigger function with conflict handling
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Extract username from email if it follows the pattern username@pos-system.local
     -- Handle potential conflicts by updating existing records
     INSERT INTO public.users (id, email, username, role)
     VALUES (
       NEW.id, 
       NEW.email, 
       CASE 
         WHEN NEW.email LIKE '%@pos-system.local' THEN 
           SPLIT_PART(NEW.email, '@', 1)
         ELSE 
           NULL
       END,
       'cashier'
     )
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       username = EXCLUDED.username,
       role = EXCLUDED.role;
     
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Recreate the trigger
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
4. Run the script

### 2. Verify the Fix
After running the script, you can verify it worked by:

1. Checking that the function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```

2. Checking that the trigger exists:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

### 3. Test Cashier Creation
1. Go to your admin panel
2. Navigate to Cashier Management
3. Click "Add Cashier"
4. Enter a unique username
5. Leave password blank to use auto-generated password
6. Click "Add Cashier"

## Common Issues and Solutions

### Issue: "Function handle_new_user() does not exist"
**Solution**: Make sure you ran the complete script including the `CREATE OR REPLACE FUNCTION` part.

### Issue: "Trigger on_auth_user_created already exists"
**Solution**: The script includes `DROP TRIGGER IF EXISTS` which should prevent this. If you still get this error, manually drop the trigger first:
```sql
DROP TRIGGER on_auth_user_created ON auth.users;
```

### Issue: Permission denied
**Solution**: Make sure you're running this as a user with sufficient privileges. In Supabase, you should be able to run this as the default user.

### Issue: Still getting "Database error saving new user"
**Solution**: 
1. Check the Supabase logs for more detailed error messages
2. Verify that the users table has the correct schema with username column
3. Make sure you've run the migration to add the username column:
   ```sql
   ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
   ```

## Additional Verification

If you want to test that the trigger function works correctly, you can:

1. Check the current structure of your users table:
   ```sql
   \d users
   ```

2. Make sure it includes the username column:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'username';
   ```

## Rollback Plan

If you need to rollback the changes:

1. Drop the updated trigger:
   ```sql
   DROP TRIGGER on_auth_user_created ON auth.users;
   ```

2. Recreate the original function (without conflict handling):
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, username, role)
     VALUES (
       NEW.id, 
       NEW.email, 
       CASE 
         WHEN NEW.email LIKE '%@pos-system.local' THEN 
           SPLIT_PART(NEW.email, '@', 1)
         ELSE 
           NULL
       END,
       'cashier'
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. Recreate the trigger:
   ```sql
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

## Need More Help?

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Check the Supabase logs for database errors
3. Verify that all migration scripts have been run
4. Make sure your Supabase project is properly configured