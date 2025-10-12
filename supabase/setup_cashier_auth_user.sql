-- Script to set up the special cashier user in Supabase Auth
-- This user will be used for all cashier sessions to work with the existing middleware

-- First, check if the user already exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'cashier@pos-system.local';

-- If the user doesn't exist, you can create it through the Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add user"
-- 3. Email: cashier@pos-system.local
-- 4. Password: cashier-password-123
-- 5. User metadata: { role: 'cashier' }

-- Alternatively, if you have admin privileges, you can create it programmatically:
-- SELECT auth.email_sign_up('cashier@pos-system.local', 'cashier-password-123');

-- After creating the user, we need to add it to the public.users table
-- Check if it already exists in public.users
SELECT id, email, role 
FROM users 
WHERE email = 'cashier@pos-system.local';

-- If it doesn't exist in public.users, insert it:
INSERT INTO users (id, email, role)
SELECT id, 'cashier@pos-system.local', 'cashier'
FROM auth.users
WHERE email = 'cashier@pos-system.local'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'cashier@pos-system.local'
);

-- Verify the user exists in both tables
SELECT 
    a.id,
    a.email as auth_email,
    u.email as public_email,
    u.role
FROM auth.users a
LEFT JOIN users u ON a.id = u.id
WHERE a.email = 'cashier@pos-system.local';