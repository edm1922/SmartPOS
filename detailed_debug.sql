-- Detailed debugging script to identify the exact issue
-- Run this script in your Supabase SQL Editor

-- 1. Check the exact definition of the handle_new_user function
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if there are any other triggers on auth.users
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled_status
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- 3. Check the current state of the users table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 4. Check for any existing users that might conflict
SELECT 
    id,
    email,
    username,
    role,
    created_at
FROM users 
WHERE email LIKE '%@pos-system.local'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test the exact scenario that might be failing
DO $$
DECLARE
    test_id UUID := '12345678-1234-1234-1234-123456789012'; -- Fixed UUID for testing
    test_email TEXT := 'debug-test@pos-system.local';
BEGIN
    RAISE NOTICE 'Testing with ID: %, Email: %', test_id, test_email;
    
    -- Test the exact logic from the trigger
    INSERT INTO public.users (id, email, username, role)
    VALUES (
        test_id, 
        test_email, 
        CASE 
            WHEN test_email LIKE '%@pos-system.local' THEN 
                SPLIT_PART(test_email, '@', 1)
            ELSE 
                NULL
        END,
        'cashier'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        role = EXCLUDED.role;
    
    RAISE NOTICE 'Insert/Update successful';
    
    -- Check if the record was created correctly
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id) THEN
        RAISE NOTICE 'Record found in users table';
        -- Show the record
        RAISE NOTICE 'Record: %', (SELECT row_to_json(u) FROM users u WHERE id = test_id);
    ELSE
        RAISE NOTICE 'Record NOT found in users table';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- 6. Check if there are any RLS policies that might interfere
SELECT 
    polname as policy_name,
    polcmd as command_type,
    polroles as roles
FROM pg_policy 
WHERE polrelid = 'users'::regclass;

-- 7. Check for any constraints that might be causing issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conkey as column_keys
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;