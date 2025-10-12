-- Migration script to add soft delete columns to existing users table
-- This script adds deleted_at and is_active columns to support soft delete functionality

-- Add deleted_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add is_active column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing users to ensure they have the default values
UPDATE users 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Add a comment to document the purpose of these columns
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted';
COMMENT ON COLUMN users.is_active IS 'Flag to indicate if user is active (not soft deleted)';