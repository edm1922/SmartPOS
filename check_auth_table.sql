-- Check auth.users table structure and permissions
-- Run this script in your Supabase SQL Editor

-- 1. Check if we can access basic information about auth.users
-- Note: We might not have full access to this table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name IN ('id', 'email')
ORDER BY ordinal_position;

-- 2. Check if there are any existing conflicts
SELECT COUNT(*) as auth_user_count
FROM auth.users 
WHERE email LIKE '%@pos-system.local';

-- 3. Check the RLS policies on the users table
SELECT 
    polname as policy_name,
    polrelid::regclass as table_name,
    polcmd as command_type,
    polroles as roles
FROM pg_policy 
WHERE polrelid = 'users'::regclass;