# Cashier Creation Guide

This guide explains how to create cashiers with usernames and auto-generated passwords in the POS system.

## Overview

The cashier creation feature has been updated to allow administrators to create cashiers using usernames instead of email addresses. Additionally, passwords are now auto-generated for security.

## How to Create a Cashier

1. Navigate to the Cashier Management page in the admin panel
2. Click the "Add Cashier" button
3. Enter a unique username for the new cashier
4. Optionally, enter a password (if left blank, a secure password will be auto-generated)
5. Click "Add Cashier"

## Technical Implementation Details

### Username-based Authentication

- Cashiers can now be created using usernames instead of email addresses
- For compatibility with Supabase Auth, a fake email is generated using the format `username@pos-system.local`
- Both the username and fake email are stored in the database
- Uses `supabase.auth.signUp()` instead of `admin.createUser()` to avoid permission issues
- Relies on database trigger function to automatically create user in public.users table
- No additional database operations needed after signup

### Auto-generated Passwords

- When creating a cashier, if no password is provided, a secure 12-character password is automatically generated
- Generated passwords include:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*()_+-=)

### Database Schema

The users table has been updated to include a username column:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
```

### Security Policies

The security policies have been updated to extract usernames from emails when they follow the `username@pos-system.local` pattern.

## Login Process

Cashiers can log in using either their username or email address. The system will automatically look up the correct email address when a username is provided.

## Best Practices

1. Use unique, descriptive usernames for cashiers
2. Let the system auto-generate passwords for enhanced security
3. Communicate the auto-generated passwords to cashiers through secure channels
4. Encourage cashiers to change their passwords after first login

## Troubleshooting

### "Username already exists" Error

This error occurs when trying to create a cashier with a username that is already in use. Choose a different username.

### "Invalid username" Error

Usernames must be at least 3 characters long. Make sure the username meets this requirement.

### Login Issues

If a cashier cannot log in:
1. Verify the username is correct
2. Confirm the password was entered correctly
3. Check that the cashier account is active (not soft deleted)