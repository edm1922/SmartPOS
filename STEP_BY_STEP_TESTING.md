# Step-by-Step Testing Guide

## Prerequisites
1. You've run the `fix_trigger_function.sql` script
2. You have access to your Supabase dashboard

## Step 1: Verify the Fix in Supabase

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Run the `supabase_verify_fix.sql` script:
   ```
   -- Check if the function exists
   SELECT proname, pronamespace::regnamespace as schema_name
   FROM pg_proc 
   WHERE proname = 'handle_new_user';
   
   -- Check if the trigger exists
   SELECT tgname, tgrelid::regclass as table_name
   FROM pg_trigger 
   WHERE tgname = 'on_auth_user_created';
   
   -- Check the structure of the users table
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('id', 'email', 'username', 'role')
   ORDER BY ordinal_position;
   ```

4. You should see:
   - The `handle_new_user` function exists
   - The `on_auth_user_created` trigger exists
   - The users table has a `username` column

## Step 2: Test in the Application

1. Go to your admin panel
2. Navigate to Cashier Management
3. Click "Add Cashier"
4. Enter a unique username (e.g., "testcashier001")
5. Leave the password field blank to use auto-generated password
6. Click "Add Cashier"

## Step 3: Monitor for Errors

1. Open the browser's developer console (F12)
2. Look for any error messages
3. Check the Network tab for failed requests

## Step 4: Verify Success

If successful, you should see:
1. No error messages in the browser console
2. The new cashier appears in the cashier list
3. The username is displayed correctly

## Step 5: Test Login

1. Go to the cashier login page
2. Try to log in with:
   - Username: the username you just created
   - Password: check the browser console for the auto-generated password (it was logged during creation)
   
   OR
   
   - Go back to the admin panel
   - Check the cashier list
   - The auto-generated password should be visible in the console logs

## Common Issues and Solutions

### Issue: Still getting "Database error saving new user"
**Solution**:
1. Run the detailed_troubleshooting.sql script
2. Check for duplicate usernames or emails
3. Make sure the users table structure is correct

### Issue: Cashier created but username is null
**Solution**:
1. Verify the email format is correct (`username@pos-system.local`)
2. Check that the trigger function is extracting the username properly

### Issue: Cannot log in with the username
**Solution**:
1. Verify the user exists in both auth.users and public.users tables
2. Check that the username field is populated correctly

## If Problems Persist

1. Run the `detailed_troubleshooting.sql` script
2. Check the Supabase logs for detailed error messages
3. Verify all migration scripts have been run
4. Make sure your environment variables are correct

## Need More Help?

If you're still experiencing issues:

1. Share the exact error message you're seeing
2. Include any relevant information from the troubleshooting scripts
3. Check if there are any constraints or policies that might be interfering