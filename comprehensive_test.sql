-- Comprehensive test to verify the cashier creation fix
-- Run this script in your Supabase SQL Editor

-- 1. Verify the handle_new_user function exists and is correct
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';

-- 2. Verify the trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Verify the users table has the username column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- 4. Test the logic used in the trigger function
SELECT 
    'testuser@pos-system.local' as test_email,
    SPLIT_PART('testuser@pos-system.local', '@', 1) as extracted_username,
    CASE 
        WHEN 'testuser@pos-system.local' LIKE '%@pos-system.local' THEN 
            SPLIT_PART('testuser@pos-system.local', '@', 1)
        ELSE 
            NULL
    END as conditional_username;

-- 5. Test a direct insert with ON CONFLICT (this is what the trigger does)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- Test insert with ON CONFLICT
    INSERT INTO users (id, email, username, role)
    VALUES (
        test_id,
        'comprehensive-test@pos-system.local',
        'comprehensive-test',
        'cashier'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        role = EXCLUDED.role;
    
    RAISE NOTICE 'Direct insert test: PASSED';
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Direct insert test: FAILED with error: %', SQLERRM;
END $$;

-- 6. Check for any existing duplicate usernames
SELECT username, COUNT(*) as count
FROM users 
WHERE username IS NOT NULL
GROUP BY username 
HAVING COUNT(*) > 1;

-- 7. Check for any existing duplicate emails
SELECT email, COUNT(*) as count
FROM users 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1;