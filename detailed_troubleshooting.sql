-- Detailed troubleshooting script for cashier creation issues
-- Run this script in your Supabase SQL Editor

-- 1. Check if the users table has the correct structure
\d users

-- 2. Check for any existing data that might cause conflicts
SELECT id, email, username, role, created_at 
FROM users 
WHERE email LIKE '%@pos-system.local' 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if there are any duplicate usernames
SELECT username, COUNT(*) as count
FROM users 
WHERE username IS NOT NULL
GROUP BY username 
HAVING COUNT(*) > 1;

-- 4. Check if there are any duplicate emails
SELECT email, COUNT(*) as count
FROM users 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1;

-- 5. Check the auth.users table structure (read-only)
-- Note: You might not have permission to do this, which is fine
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users' 
LIMIT 5;

-- 6. Check if the function exists and view its source
SELECT pg_get_functiondef(p.oid) as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user' AND n.nspname = 'public';

-- 7. Check for any recent errors in the logs (if you have access)
-- This might not work depending on your permissions:
/*
SELECT *
FROM supabase_logs.logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
AND (message LIKE '%handle_new_user%' OR message LIKE '%trigger%')
ORDER BY timestamp DESC
LIMIT 10;
*/

-- 8. Test inserting a sample record to see if the trigger works
-- WARNING: This will create a record in your users table
-- Comment this out if you don't want to create a test record:
/*
INSERT INTO users (id, email, username, role)
VALUES (
    gen_random_uuid(),
    'test-trigger@pos-system.local',
    'test-trigger',
    'cashier'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;
*/

-- If the above worked, clean up the test record:
-- DELETE FROM users WHERE username = 'test-trigger';