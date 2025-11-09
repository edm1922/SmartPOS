# Settings Page Implementation

## Overview
This document describes the implementation of the admin settings page with persistent storage using Supabase.

## Changes Made

### 1. Database Schema
Created a new `settings` table in the database with the following structure:

```sql
-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_phone TEXT NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,
  currency_code TEXT DEFAULT 'PHP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if none exist
INSERT INTO settings (store_name, store_address, store_phone, tax_rate, currency_code)
SELECT 'AJ Softdrive POS', '123 Business Street, Metro Manila', '+63 912 345 6789', 12.00, 'PHP'
WHERE NOT EXISTS (SELECT 1 FROM settings);
```

File: `supabase/create_settings_table.sql`

### 2. Supabase Client Functions
Added two new functions to the Supabase client:

1. `getSettings()` - Fetches the current settings from the database
2. `updateSettings()` - Updates or creates settings in the database

File: `src/lib/supabaseClient.ts`

### 3. Settings Page Implementation
Updated the admin settings page to:

- Fetch settings from the database on load
- Save settings to the database when the form is submitted
- Maintain the existing UI and validation

File: `src/app/admin/settings/page.tsx`

### 4. Test File
Created a basic test file to ensure the settings page renders without crashing.

File: `src/app/admin/settings/page.test.tsx`

## How It Works

1. When the settings page loads, it checks for user authentication
2. If authenticated, it fetches the current settings from the database
3. When the user submits the form, it saves the settings to the database
4. Currency is fixed to PHP and saved to localStorage for client-side access

## Testing

Run the tests with:
```bash
npm test src/app/admin/settings/page.test.tsx
```

## Database Migration

To apply the settings table to your database:

1. Run the SQL script in `supabase/create_settings_table.sql` in your Supabase SQL editor
2. The script will create the table and insert default values if no settings exist

## Future Improvements

1. Add more comprehensive tests with mocking
2. Implement additional settings sections (Security, Notifications, Receipts)
3. Add real-time updates using Supabase subscriptions
4. Implement settings validation on the backend