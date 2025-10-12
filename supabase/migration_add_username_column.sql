-- Migration script to add username column to existing users table
-- This script adds a username column to support username-based login

-- Add username column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- For existing users with emails in the format username@pos-system.local, 
-- extract the username from the email
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE email LIKE '%@pos-system.local' 
AND username IS NULL;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN users.username IS 'Username for user login (alternative to email)';