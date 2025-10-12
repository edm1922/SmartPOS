# Applying Database Fixes for Transaction Creation

This document provides instructions on how to apply the necessary database fixes to resolve the "error creating transaction, please try again" issue in the POS system.

## Overview

The issue occurs because the database Row Level Security (RLS) policies haven't been updated to properly support custom cashier authentication. The SQL fixes have been prepared but need to be applied to your Supabase database.

## Prerequisites

- Access to your Supabase project dashboard
- Supabase SQL editor access
- Database administrator privileges

## Steps to Apply Fixes

### 1. Access Supabase SQL Editor

1. Log in to your Supabase project dashboard
2. Navigate to the SQL editor (Database → SQL Editor)
3. Create a new query tab

### 2. Apply Transaction Security Fixes

Copy and paste the contents of `supabase/apply_transaction_fixes.sql` into the SQL editor:

```sql
-- Apply security policy fixes for transaction creation in cashier POS system

-- Fix transactions table policies to allow cashiers to insert transactions
-- Users can view their own transactions (cashiers can view their transactions)
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (cashier_id = auth.uid());

-- Cashiers and admins can insert transactions
-- Modified to allow both authenticated users and custom cashier sessions
DROP POLICY IF EXISTS "Authorized users can insert transactions" ON transactions;
CREATE POLICY "Authorized users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    -- Allow authenticated users with cashier or admin role
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('cashier', 'admin') AND is_active = true
    )
    OR
    -- Allow custom cashier authentication (when using session-based auth)
    -- For custom authentication, check that the cashier_id matches a valid active cashier
    -- This is a simpler check that avoids recursion issues
    (cashier_id IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.cashiers 
       WHERE id = cashier_id AND is_active = true
     ))
  );

-- Admins can view all transactions (checking role from database)
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Fix transaction items table policies
-- Users can manage transaction items for their transactions
DROP POLICY IF EXISTS "Users can manage their transaction items" ON transaction_items;
CREATE POLICY "Users can manage their transaction items" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id AND t.cashier_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id AND t.cashier_id = auth.uid()
    )
  );

-- Admins can view all transaction items (checking role from database)
DROP POLICY IF EXISTS "Admins can view all transaction items" ON transaction_items;
CREATE POLICY "Admins can view all transaction items" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Fix cashiers table policies
-- Allow anyone to authenticate cashiers (needed for login)
DROP POLICY IF EXISTS "Allow cashier authentication" ON cashiers;
CREATE POLICY "Allow cashier authentication" ON cashiers
  FOR SELECT USING (true);

-- Allow cashiers to view their own record (for profile management)
DROP POLICY IF EXISTS "Cashiers can view own record" ON cashiers;
CREATE POLICY "Cashiers can view own record" ON cashiers
  FOR SELECT USING (
    id = auth.uid()
  );

-- Grant necessary permissions
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transaction_items TO authenticated;
GRANT SELECT ON TABLE cashiers TO anon; -- Allow anonymous SELECT for authentication
```

### 3. Run the Query

1. Click the "Run" button in the SQL editor
2. Verify that the query executes successfully without errors
3. Check the output to confirm that all policies were created

### 4. Verify the Fixes

After applying the fixes, you can verify that the policies have been applied correctly by running:

```sql
-- Check transactions table policies
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'transactions'
ORDER BY policyname;
```

## Testing the Fix

1. Log in to the cashier POS system
2. Add items to the cart
3. Process a payment
4. Verify that the transaction is created successfully

## Troubleshooting

If you still encounter issues after applying the fixes:

1. Check the browser console for detailed error messages
2. Verify that the cashier account is active in the database:
   ```sql
   SELECT id, username, is_active FROM cashiers WHERE id = 'CASHIER_ID_HERE';
   ```
3. Test inserting a transaction directly in the SQL editor:
   ```sql
   INSERT INTO transactions (cashier_id, total_amount, payment_method, status)
   VALUES ('CASHIER_ID_HERE', 100.00, 'cash', 'completed')
   RETURNING *;
   ```

## Additional Notes

- The fixes only need to be applied once to the database
- Make sure to backup your database before applying any changes
- If you encounter any errors while applying the fixes, consult the troubleshooting documentation