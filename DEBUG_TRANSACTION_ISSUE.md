# Debugging Transaction Creation Issues

This document provides a systematic approach to resolve the "Access denied: You do not have permission to create transactions" error.

## Current Issue

You're experiencing an RLS (Row Level Security) Policy Violation when trying to create transactions, even after applying the SQL fixes. This suggests there may be multiple issues at play.

## Diagnostic Steps

### Step 1: Check Current Database Policies

Run the debug script to see what policies currently exist:

1. Open `debug_policies.sql`
2. Copy the contents
3. Run in your Supabase SQL Editor

This will show:
- Current policies on the transactions table
- Table permissions
- Whether your cashier account exists and is active

### Step 2: Apply Comprehensive Fix

If the policies are not correct, apply the comprehensive fix:

1. Open `comprehensive_fix.sql`
2. Copy the contents
3. Run in your Supabase SQL Editor

### Step 3: Test Direct Database Access

Verify if the issue is with the database or the frontend:

1. Open `test_transaction_direct.sql`
2. Copy the contents
3. Run in your Supabase SQL Editor

If this works, the issue is with the frontend authentication.

## Common Causes and Solutions

### 1. Conflicting Policies
Multiple policies on the same table can cause conflicts. The comprehensive fix drops all existing policies first.

### 2. Incorrect Table Permissions
The transactions table needs to allow INSERT operations. The fix includes:
```sql
GRANT ALL ON TABLE transactions TO authenticated;
```

### 3. RLS Not Enabled
RLS must be enabled on the table:
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

### 4. Frontend Authentication Issues
The Supabase client might not be properly configured for custom authentication.

## If Database Fixes Don't Work

If the database fixes don't resolve the issue, the problem might be in the frontend:

1. Check that the cashier session is properly stored in sessionStorage
2. Verify the cashier ID is being passed correctly in the transaction payload
3. Ensure the cashier account is active in the database

## Verification Process

After applying fixes:

1. Run the test script to verify direct database access works
2. Test transaction creation in the POS system
3. Check browser console for any remaining errors

## Emergency Solution

If all else fails, you can temporarily disable RLS for testing (NOT recommended for production):

```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

Remember to re-enable RLS after testing:
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## Support

If you continue to experience issues:

1. Share the output of the debug script
2. Provide the exact error message from the browser console
3. Include information about your Supabase project setup