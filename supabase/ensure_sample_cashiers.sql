-- Script to ensure sample cashiers exist in the database
-- This script will insert sample cashiers only if they don't already exist

-- Insert sample cashiers if they don't exist
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