-- Test user creation process
-- WARNING: This will create a test user in your database
-- Run this script in your Supabase SQL Editor

-- First, let's check if we can insert a test record directly
-- This simulates what the trigger does
INSERT INTO users (id, email, username, role)
VALUES (
    gen_random_uuid(),
    'testuser@pos-system.local',
    'testuser',
    'cashier'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;

-- Check if the user was created
SELECT 
    id,
    email,
    username,
    role,
    created_at
FROM users 
WHERE username = 'testuser';

-- Clean up the test user (uncomment the following line if you want to remove the test user)
-- DELETE FROM users WHERE username = 'testuser' AND email = 'testuser@pos-system.local';