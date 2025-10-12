# Frontend Debugging Guide for Cashier Creation

## Issue
You're still getting errors in the frontend even though the database tests are passing.

## Browser Console Debugging

1. **Open the browser's developer tools** (F12 or right-click → Inspect)
2. **Go to the Console tab**
3. **Try to create a cashier** and watch for error messages
4. **Look for specific error messages** like:
   - "Database error saving new user"
   - "Constraint violation"
   - "Unique violation"
   - "Auth error"

## Network Tab Debugging

1. **Open the Network tab** in developer tools
2. **Try to create a cashier**
3. **Look for failed requests** (they'll be highlighted in red)
4. **Click on the failed request** to see:
   - Request URL
   - Request headers
   - Request body
   - Response status
   - Response body

## Common Frontend Issues

### 1. Duplicate Username Error
If you're trying to create a cashier with a username that already exists, you'll get an error.

**Solution**: Use a unique username each time you test.

### 2. Password Too Weak
Some systems require passwords to meet certain complexity requirements.

**Solution**: The auto-generated passwords should be sufficient, but you can try entering a stronger password manually.

### 3. Network Issues
Sometimes the request fails due to network connectivity issues.

**Solution**: Check your internet connection and try again.

### 4. CORS Issues
If there are CORS (Cross-Origin Resource Sharing) issues, the request might fail.

**Solution**: This is usually a server-side configuration issue.

## Testing Steps

### 1. Clear Browser Cache
Sometimes cached data can cause issues:
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
2. Clear cache and cookies
3. Reload the page

### 2. Try a Different Browser
Try creating a cashier in a different browser to rule out browser-specific issues.

### 3. Check for JavaScript Errors
Look for any JavaScript errors in the console that might prevent the form from working correctly.

### 4. Test with a Completely New Username
Try creating a cashier with a username you've never used before:
1. Go to Cashier Management
2. Click "Add Cashier"
3. Enter a unique username like "testuser12345"
4. Leave password blank
5. Click "Add Cashier"

## Backend Verification

### 1. Check Auth Users Table
Verify that users are being created in the auth system:
```sql
-- Check if the user exists in auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE '%@pos-system.local'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check Public Users Table
Verify that users are being synced to the public table:
```sql
-- Check if the user exists in public.users
SELECT id, email, username, role, created_at
FROM users
WHERE email LIKE '%@pos-system.local'
ORDER BY created_at DESC
LIMIT 10;
```

## Environment Variables

Make sure your environment variables are correctly configured:
1. Check your `.env` file
2. Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
3. Make sure there are no extra spaces or characters

## If All Else Fails

1. **Check Supabase Logs**: Look at the Supabase dashboard for any detailed error messages
2. **Try Manual Creation**: Test creating a user directly in the Supabase Auth dashboard
3. **Check for Recent Changes**: See if any recent changes to your code might have introduced the issue