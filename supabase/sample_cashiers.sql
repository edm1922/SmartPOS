-- Insert sample data into the cashiers table
-- Use secure passwords in production

INSERT INTO cashiers (username, password, email) VALUES 
('cashier1', 'Password123!', 'cashier1@example.com'),
('cashier2', 'Password456!', 'cashier2@example.com'),
('cashier3', 'Password789!', null);

-- Verify the data was inserted
SELECT id, username, email, created_at FROM cashiers ORDER BY created_at;