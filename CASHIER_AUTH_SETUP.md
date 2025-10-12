# Cashier Authentication Setup

## Overview
This document explains how to set up authentication for cashiers in the POS system while maintaining compatibility with the existing middleware.

## Issue Identified
The previous implementation stored cashier information in sessionStorage, but the middleware checks for Supabase sessions. This caused authentication to fail because no Supabase session was created.

## Solution Implemented
The new implementation creates a Supabase session using a special "cashier" user account while still storing the actual cashier information in sessionStorage.

## Setup Steps

### 1. Create the Special Cashier User
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter the following details:
   - Email: `cashier@pos-system.local`
   - Password: `cashier-password-123` (change this to a secure password in production)
5. Click "Add User"

### 2. Add the User to the Public Users Table
Run the following SQL in your Supabase SQL Editor:

```sql
INSERT INTO users (id, email, role)
SELECT id, 'cashier@pos-system.local', 'cashier'
FROM auth.users
WHERE email = 'cashier@pos-system.local'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'cashier@pos-system.local'
);
```

### 3. Verify Setup
Run this query to verify the user exists in both tables:

```sql
SELECT 
    a.id,
    a.email as auth_email,
    u.email as public_email,
    u.role
FROM auth.users a
LEFT JOIN users u ON a.id = u.id
WHERE a.email = 'cashier@pos-system.local';
```

## How Authentication Works

### Login Process
1. Cashier enters username and password in the login form
2. System authenticates against the cashiers table
3. If authentication is successful:
   - System creates a Supabase session using the special cashier user
   - System stores the actual cashier info in sessionStorage
   - Cashier is redirected to the POS terminal

### Middleware Check
1. Middleware checks for any Supabase session (doesn't distinguish between admin and cashier users)
2. If a session exists, access is granted to cashier routes
3. If no session exists, user is redirected to cashier login

### POS Terminal Usage
1. POS terminal can access the actual cashier info from sessionStorage
2. This info includes the real cashier ID and username
3. Transactions and activities are logged with the real cashier info

## Security Considerations

### Current Implementation
- Uses a shared "cashier" user for Supabase sessions
- Stores real cashier info in sessionStorage
- Passwords stored in plain text (for development)

### Production Recommendations
1. Change the special cashier user password to a secure, randomly generated password
2. Hash passwords in the cashiers table
3. Implement proper session management with JWT tokens
4. Add session expiration and refresh mechanisms
5. Add rate limiting for login attempts
6. Consider implementing role-based checks in the middleware

## Testing

### Manual Testing
1. Create the special cashier user in Supabase Auth
2. Add the user to the public users table
3. Try logging in with cashier credentials:
   - Username: cashier1
   - Password: Password123!
4. Verify you're redirected to the POS terminal
5. Check that sessionStorage contains the correct cashier info
6. Verify that admin functionality remains unaffected

### Troubleshooting
If you still encounter issues:

1. Check that the special cashier user exists in both auth.users and public.users tables
2. Verify the credentials used in the login page match the special user
3. Check the browser console for any error messages
4. Verify that the middleware is correctly configured