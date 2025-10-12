-- Simulate the exact signup process to identify where the error occurs
-- Run this script in your Supabase SQL Editor

-- 1. Test the trigger function directly with realistic data
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'simulation-test@pos-system.local';
    test_username TEXT := 'simulation-test';
BEGIN
    RAISE NOTICE 'Simulating signup with ID: %, Email: %, Username: %', test_id, test_email, test_username;
    
    -- This simulates what happens in the handle_new_user trigger
    INSERT INTO public.users (id, email, username, role)
    VALUES (
        test_id,
        test_email,
        test_username,
        'cashier'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        role = EXCLUDED.role;
    
    RAISE NOTICE 'Simulation successful - user created/updated';
    
    -- Verify the user was created correctly
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id AND username = test_username) THEN
        RAISE NOTICE 'Verification successful - user exists with correct username';
    ELSE
        RAISE NOTICE 'Verification failed - user not found or incorrect username';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Simulation failed with error: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
    
    -- Try to clean up even if there was an error
    BEGIN
        DELETE FROM users WHERE id = test_id;
    EXCEPTION WHEN others THEN
        -- Ignore cleanup errors
    END;
END $$;

-- 2. Test with a username that might already exist
DO $$
DECLARE
    existing_username TEXT;
    test_id UUID := gen_random_uuid();
BEGIN
    -- Find an existing username if any exist
    SELECT username INTO existing_username FROM users WHERE username IS NOT NULL LIMIT 1;
    
    IF existing_username IS NOT NULL THEN
        RAISE NOTICE 'Testing with existing username: %', existing_username;
        
        -- Try to insert with the same username but different ID
        INSERT INTO users (id, email, username, role)
        VALUES (
            test_id,
            existing_username || '@pos-system.local',
            existing_username,
            'cashier'
        );
        
        RAISE NOTICE 'Insert with existing username succeeded';
        DELETE FROM users WHERE id = test_id;
        
    ELSE
        RAISE NOTICE 'No existing usernames found to test with';
    END IF;
    
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Expected unique violation occurred - this is normal if username constraint is working';
    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Unexpected error: %', SQLERRM;
    -- Clean up
    DELETE FROM users WHERE id = test_id;
END $$;

-- 3. Check if there are any row-level security policies that might interfere
SELECT 
    polname as policy_name,
    polcmd as command_type,
    polroles as roles,
    polqual as using_clause,
    polwithcheck as with_check_clause
FROM pg_policy 
WHERE polrelid = 'users'::regclass;