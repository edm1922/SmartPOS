-- Test script to verify the handle_new_user trigger is working correctly
-- Run this script in your Supabase SQL Editor

-- First, check if the function exists
SELECT proname, probin FROM pg_proc WHERE proname = 'handle_new_user';

-- Check if the trigger exists
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test the function with a sample insert (this won't actually create a user in auth.users)
-- but will help us see if there are any syntax errors
/*
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Insert a test record into a temporary table to mimic auth.users
  CREATE TEMP TABLE test_auth_users (
    id UUID,
    email TEXT
  );
  
  INSERT INTO test_auth_users (id, email) 
  VALUES (test_user_id, 'testuser@pos-system.local');
  
  -- This would normally be triggered automatically, but we can test the function directly
  -- by calling it with a test record
  RAISE NOTICE 'Test completed';
  
  DROP TABLE test_auth_users;
END $$;
*/