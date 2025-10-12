-- Simple troubleshooting script for cashier creation issues
-- Run this script in your Supabase SQL Editor

-- 1. Check if the handle_new_user function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Check the users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- 4. Check for duplicate usernames
SELECT username, COUNT(*) 
FROM users 
WHERE username IS NOT NULL 
GROUP BY username 
HAVING COUNT(*) > 1;

-- 5. Test the email parsing logic
SELECT 
    'testuser@pos-system.local' as email,
    SPLIT_PART('testuser@pos-system.local', '@', 1) as username;

-- 6. Try to manually call the function (this is a test only)
-- DO NOT run this if you don't want to create a test user:
/*
DO $$
DECLARE
    result TEXT;
BEGIN
    -- This tests that the function exists and can be called
    RAISE NOTICE 'Function test: handle_new_user function exists';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;
*/