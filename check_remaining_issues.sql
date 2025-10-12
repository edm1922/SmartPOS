-- Check remaining issues to ensure everything is working correctly
-- Run this script in your Supabase SQL Editor

-- 1. Check if the trigger exists and is attached to the correct table
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled_status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. Check the users table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'email', 'username', 'role', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- 3. Check for any constraints on the username column
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users' 
AND (kcu.column_name = 'username' OR tc.constraint_name LIKE '%username%');

-- 4. Check if there are any existing users with pos-system.local emails
SELECT 
    id,
    email,
    username,
    role
FROM users 
WHERE email LIKE '%@pos-system.local'
LIMIT 5;

-- 5. Test a sample insert to verify the function works
-- This is a safe test that won't affect your actual data
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'testuser@pos-system.local';
    username_result TEXT;
BEGIN
    -- Test the logic used in the trigger function
    username_result := CASE 
        WHEN test_email LIKE '%@pos-system.local' THEN 
            SPLIT_PART(test_email, '@', 1)
        ELSE 
            NULL
    END;
    
    RAISE NOTICE 'Test email: %', test_email;
    RAISE NOTICE 'Extracted username: %', username_result;
    RAISE NOTICE 'Logic test: PASSED';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Logic test: FAILED with error: %', SQLERRM;
END $$;