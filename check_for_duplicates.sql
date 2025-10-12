-- Check for potential duplicate issues that might cause errors
-- Run this script in your Supabase SQL Editor

-- 1. Check for duplicate usernames (case insensitive)
SELECT 
    LOWER(username) as username_lower,
    COUNT(*) as count
FROM users 
WHERE username IS NOT NULL
GROUP BY LOWER(username)
HAVING COUNT(*) > 1;

-- 2. Check for duplicate emails (case insensitive)
SELECT 
    LOWER(email) as email_lower,
    COUNT(*) as count
FROM users 
WHERE email IS NOT NULL
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- 3. Check for any users with the same username pattern we're using
SELECT 
    id,
    email,
    username,
    role
FROM users 
WHERE email LIKE '%@pos-system.local'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if there are any constraints that might be causing issues
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'users'
AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY', 'FOREIGN KEY')
ORDER BY tc.constraint_name;

-- 5. Check the exact structure of the users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 6. Test inserting a user with a very long username to check constraints
DO $$
DECLARE
    long_username TEXT := 'verylongusernamethatmightexceedthelimit';
BEGIN
    RAISE NOTICE 'Testing with long username: %', long_username;
    
    -- Check the length
    RAISE NOTICE 'Username length: %', LENGTH(long_username);
    
    -- This will help us understand if there are any length constraints
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error with long username: %', SQLERRM;
END $$;