-- Script to delete a user from auth.users
-- WARNING: This will permanently delete the user and may cause issues with related data
-- Use with extreme caution and ensure you have backups

-- First, let's see what user we're going to delete
-- Replace 'user@example.com' with the actual email of the user you want to delete
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- If you know the user's UUID instead, you can use:
-- SELECT id, email, created_at 
-- FROM auth.users 
-- WHERE id = 'USER-UUID-HERE';

-- To delete the user from auth.users:
-- Replace 'user@example.com' with the actual email of the user you want to delete
DELETE FROM auth.users 
WHERE email = 'user@example.com';

-- If you know the user's UUID instead, you can use:
-- DELETE FROM auth.users 
-- WHERE id = 'USER-UUID-HERE';

-- IMPORTANT: You should also delete the corresponding user from your public.users table
-- Replace 'user@example.com' with the actual email of the user you want to delete
DELETE FROM public.users 
WHERE email = 'user@example.com';

-- If you know the user's UUID instead, you can use:
-- DELETE FROM public.users 
-- WHERE id = 'USER-UUID-HERE';

-- Optional: Delete any related data (adjust according to your application's needs)
-- For example, if you want to delete a cashier's transactions:
-- DELETE FROM public.transactions 
-- WHERE cashier_id = 'USER-UUID-HERE';

-- To delete all activity logs for the user:
-- DELETE FROM public.activity_logs 
-- WHERE user_id = 'USER-UUID-HERE';

-- IMPORTANT NOTES:
-- 1. Always backup your database before running delete operations
-- 2. Make sure there are no foreign key constraints that would prevent deletion
-- 3. Consider implementing a soft delete approach instead (using a 'deleted_at' or 'is_active' field)
-- 4. Be aware that deleting users may affect analytics and historical data