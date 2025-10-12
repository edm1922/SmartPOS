-- Create a separate cashiers table to avoid modifying the existing users table
-- This preserves the existing admin functionality while adding cashier-specific features

-- Create the cashiers table
CREATE TABLE IF NOT EXISTS cashiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Store hashed passwords
  email TEXT UNIQUE, -- Optional email for password reset, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add comments to document the table and columns
COMMENT ON TABLE cashiers IS 'Separate table for cashier accounts to maintain separation from admin users';
COMMENT ON COLUMN cashiers.username IS 'Unique username for cashier login';
COMMENT ON COLUMN cashiers.password IS 'Hashed password for authentication';
COMMENT ON COLUMN cashiers.email IS 'Optional email for password reset and communication';
COMMENT ON COLUMN cashiers.is_active IS 'Flag to indicate if cashier account is active';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cashiers_username ON cashiers(username);
CREATE INDEX IF NOT EXISTS idx_cashiers_is_active ON cashiers(is_active);