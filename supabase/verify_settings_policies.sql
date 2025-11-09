-- Script to verify that the settings table RLS policies are working correctly

-- First, check that RLS is enabled on the settings table
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class pc 
JOIN pg_namespace pn ON pc.relnamespace = pn.oid 
WHERE pn.nspname = 'public' AND relname = 'settings';

-- Check existing policies on the settings table
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policy 
WHERE polrelid = 'settings'::regclass;

-- Test 1: Try to select from settings as an admin user
-- (This should work if the user with auth.uid() exists in public.users with role='admin')
-- SELECT * FROM settings;

-- Test 2: Try to insert into settings as an admin user
-- (This should work if the user with auth.uid() exists in public.users with role='admin')
-- INSERT INTO settings (store_name, store_address, store_phone, tax_rate, currency_code)
-- VALUES ('Test Store', '123 Test Street', '+1 555 123 4567', 10.00, 'PHP');

-- Test 3: Try to update settings as an admin user
-- (This should work if the user with auth.uid() exists in public.users with role='admin')
-- UPDATE settings SET store_name = 'Updated Store Name' WHERE id = (SELECT id FROM settings LIMIT 1);

-- Test 4: Try to delete from settings as an admin user
-- (This should work if the user with auth.uid() exists in public.users with role='admin')
-- DELETE FROM settings WHERE id = (SELECT id FROM settings LIMIT 1);

-- Note: These tests can only be run in the Supabase SQL editor with proper authentication context
-- The actual testing would need to be done with authenticated users in the application