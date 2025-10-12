-- Fix for the handle_new_user trigger function to prevent database errors
-- Run this script in your Supabase SQL Editor

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger function with conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract username from email if it follows the pattern username@pos-system.local
  -- Handle potential conflicts by updating existing records
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE 
      WHEN NEW.email LIKE '%@pos-system.local' THEN 
        SPLIT_PART(NEW.email, '@', 1)
      ELSE 
        NULL
    END,
    'cashier'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();