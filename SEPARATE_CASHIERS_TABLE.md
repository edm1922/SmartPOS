# Separate Cashiers Table Implementation

## Overview
This document explains the implementation of a separate cashiers table to maintain separation of concerns between admin users and cashiers, addressing the issue where modifications to the public.users table were affecting admin functionality.

## Changes Made

### 1. Database Schema
Created a new `cashiers` table with the following structure:
```sql
CREATE TABLE cashiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE
);
```

### 2. Frontend Changes
- Modified `src/app/admin/cashiers/page.tsx` to work with the new cashiers table
- Updated `src/app/auth/cashier/login/page.tsx` to authenticate against the cashiers table
- Updated form labels and validation to reflect username-only authentication

### 3. Authentication Flow
- Cashiers now authenticate against the cashiers table instead of the users table
- Admin functionality remains unchanged and continues to use the existing users table
- Soft delete implementation for cashiers (is_active flag and deleted_at timestamp)

## Benefits of This Approach

1. **Separation of Concerns**: Admin users and cashiers are managed in separate tables
2. **Preserved Functionality**: Existing admin functionality is unaffected
3. **Scalability**: Each user type can have its own specific fields and constraints
4. **Security**: Different authentication mechanisms can be implemented for each user type
5. **Maintainability**: Changes to one user type don't affect the other

## Implementation Details

### Cashier Creation
1. Admin navigates to Cashier Management page
2. Clicks "Add Cashier"
3. Enters a unique username
4. Optionally enters an email address
5. Leaves password blank for auto-generation or enters a custom password
6. System creates a record in the cashiers table

### Cashier Authentication
1. Cashier goes to the login page
2. Enters username and password
3. System authenticates against the cashiers table
4. On successful authentication, cashier info is stored in session storage
5. Cashier is redirected to the POS terminal

### Soft Delete Implementation
Cashiers are not permanently deleted but marked as inactive:
- `is_active` flag set to false
- `deleted_at` timestamp is set
- Queries filter out inactive cashiers using `is('deleted_at', null)`

## Security Considerations

### Password Storage
In this implementation, passwords are stored in plain text for simplicity. In a production environment, you should:
1. Hash passwords before storing them
2. Use a secure hashing algorithm like bcrypt
3. Implement proper salting

### Session Management
Cashier sessions are currently stored in sessionStorage. For production use:
1. Implement proper JWT-based authentication
2. Add session expiration
3. Add refresh token mechanisms

## Rollback Plan

If you need to revert to the previous implementation:
1. Drop the cashiers table:
   ```sql
   DROP TABLE IF EXISTS cashiers;
   ```
2. Restore the previous cashier management page
3. Restore the previous cashier login page
4. Remove the cashier trigger functions

## Testing

### Manual Testing Required
1. Create a new cashier with username only
2. Create a new cashier with both username and email
3. Verify auto-generated passwords work
4. Log in as a cashier with correct credentials
5. Verify login fails with incorrect credentials
6. Delete a cashier and verify it's soft deleted
7. Verify deleted cashiers don't appear in the management list
8. Verify admin functionality remains unaffected

### Automated Testing
The existing test suite should be updated to:
1. Test cashier creation with the new table
2. Test cashier authentication
3. Test soft delete functionality
4. Verify admin functionality is unaffected