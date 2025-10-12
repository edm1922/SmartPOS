-- Supabase-compatible verification script to check if the trigger fix is working
-- Run this script in your Supabase SQL Editor

-- 1. Check if the function exists
SELECT proname, pronamespace::regnamespace as schema_name
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT tgname, tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check the structure of the users table to ensure it has the username column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'email', 'username', 'role')
ORDER BY ordinal_position;

-- 4. Check if there are any constraints on the users table
SELECT conname as constraint_name, contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- 5. Test the SPLIT_PART function that we use in the trigger
SELECT 
    'testuser@pos-system.local' as test_email,
    SPLIT_PART('testuser@pos-system.local', '@', 1) as extracted_username,
    CASE 
        WHEN 'testuser@pos-system.local' LIKE '%@pos-system.local' THEN 
            SPLIT_PART('testuser@pos-system.local', '@', 1)
        ELSE 
            NULL
    END as conditional_username;

-- 6. Check for any existing records that might conflict
SELECT COUNT(*) as user_count 
FROM users 
WHERE email LIKE '%@pos-system.local';

-- 7. Check the current RLS status for the users table
SELECT 
    relname as table_name, 
    relrowsecurity as rls_enabled, 
    relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname = 'users';

-- 8. View the source of the handle_new_user function (if possible)
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';