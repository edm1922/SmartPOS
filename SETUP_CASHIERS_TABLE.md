# Setting up the Cashiers Table

This document provides instructions on how to set up the separate cashiers table in your Supabase database.

## Problem
The cashier management page is not showing any cashiers because the `cashiers` table doesn't exist in the database yet.

## Solution
You need to create the `cashiers` table and insert some sample data.

## Steps

### 1. Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the following SQL commands:

```sql
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

-- Insert sample data into the cashiers table
-- Use secure passwords in production

INSERT INTO cashiers (username, password, email)
SELECT 'cashier1', 'Password123!', 'cashier1@example.com'
WHERE NOT EXISTS (
    SELECT 1 FROM cashiers WHERE username = 'cashier1'
);

INSERT INTO cashiers (username, password, email)
SELECT 'cashier2', 'Password456!', 'cashier2@example.com'
WHERE NOT EXISTS (
    SELECT 1 FROM cashiers WHERE username = 'cashier2'
);

INSERT INTO cashiers (username, password, email)
SELECT 'cashier3', 'Password789!', null
WHERE NOT EXISTS (
    SELECT 1 FROM cashiers WHERE username = 'cashier3'
);

-- Verify the data was inserted
SELECT id, username, email, created_at FROM cashiers ORDER BY created_at;
```

### 2. Verify the Setup

After running the SQL commands:

1. Refresh your admin dashboard
2. Navigate to the Cashier Management page
3. You should now see the sample cashiers (cashier1, cashier2, cashier3)

## Troubleshooting

If you still don't see the cashiers:

1. Check the browser console for any error messages
2. Verify that the SQL commands executed without errors in the Supabase SQL Editor
3. Check that the `cashiers` table was created by running:
   ```sql
   SELECT * FROM cashiers;
   ```
4. Make sure your Supabase environment variables are correctly configured in your `.env` file

## Security Note

In a production environment, you should:
1. Hash passwords before storing them using a secure hashing algorithm like bcrypt
2. Use environment variables for sensitive data
3. Implement proper authentication and authorization checks