-- Comprehensive verification script to check if the trigger fix is working
-- Run this script in your Supabase SQL Editor

-- 1. Check if the function exists and its definition
\df public.handle_new_user

-- 2. Check if the trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check the structure of the users table to ensure it has the username column
\d users

-- 4. Check if the username column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- 5. Test the function with a sample call (without actually inserting into auth.users)
-- This is a safe test that won't affect your actual data
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test the SPLIT_PART function that we use in the trigger
    test_result := SPLIT_PART('testuser@pos-system.local', '@', 1);
    RAISE NOTICE 'SPLIT_PART test result: %', test_result;
    
    -- Test with a non-matching email
    test_result := SPLIT_PART('test@example.com', '@', 1);
    RAISE NOTICE 'SPLIT_PART test result (non-matching): %', test_result;
    
    RAISE NOTICE 'Function syntax appears correct';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error testing function: %', SQLERRM;
END $$;

-- 6. Check for any existing records that might conflict
SELECT COUNT(*) as user_count FROM users WHERE email LIKE '%@pos-system.local';

-- 7. Check if there are any constraints that might be causing issues
SELECT conname, conkey, confkey
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'u';

-- 8. Check the current RLS status for the users table
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class 
WHERE relname = 'users';