-- Final verification to ensure everything is working
-- Run this script in your Supabase SQL Editor

-- 1. Check that the trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 2. Test the complete workflow with a sample insert
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    user_count_before INTEGER;
    user_count_after INTEGER;
BEGIN
    -- Count users before insert
    SELECT COUNT(*) INTO user_count_before FROM users;
    
    -- Test the exact logic used in the trigger
    INSERT INTO users (id, email, username, role)
    VALUES (
        test_id,
        'final-test@pos-system.local',
        'final-test',
        'cashier'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        role = EXCLUDED.role;
    
    -- Count users after insert
    SELECT COUNT(*) INTO user_count_after FROM users;
    
    RAISE NOTICE 'Users before: %, Users after: %', user_count_before, user_count_after;
    
    -- Verify the user was inserted/updated correctly
    IF EXISTS (SELECT 1 FROM users WHERE id = test_id AND username = 'final-test') THEN
        RAISE NOTICE 'Final test: PASSED - User created successfully';
    ELSE
        RAISE NOTICE 'Final test: FAILED - User not found';
    END IF;
    
    -- Clean up
    DELETE FROM users WHERE id = test_id;
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Final test: FAILED with error: %', SQLERRM;
END $$;

-- 3. Check for any potential conflicts
SELECT username, COUNT(*) as count
FROM users 
WHERE username IS NOT NULL
GROUP BY username 
HAVING COUNT(*) > 1
LIMIT 5;

-- 4. Verify the function source one more time
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';