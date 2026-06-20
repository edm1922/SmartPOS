-- Create customers table for tracking customer information
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id to transactions for linking purchases to customers
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

COMMENT ON TABLE customers IS 'Customer information for tracking purchase history';
COMMENT ON COLUMN customers.name IS 'Customer display name';

-- RLS: disable then re-enable to avoid conflicts
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;

-- Allow anyone to view customers (required for cashier POS)
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
CREATE POLICY "Anyone can view customers" ON customers
  FOR SELECT USING (true);

-- Allow anyone to insert customers (cashier POS creates customers during checkout)
DROP POLICY IF EXISTS "Anyone can insert customers" ON customers;
CREATE POLICY "Anyone can insert customers" ON customers
  FOR INSERT WITH CHECK (true);

-- Allow admins to manage customers
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON TABLE customers TO authenticated;
GRANT ALL ON TABLE customers TO anon;

-- Insert sample customers
INSERT INTO customers (name, created_at) VALUES
('Humphrey Bogart', NOW() - INTERVAL '60 days'),
('Audrey Hepburn', NOW() - INTERVAL '45 days'),
('Marlon Brando', NOW() - INTERVAL '30 days');

-- Insert sample transactions linked to customers
INSERT INTO transactions (cashier_id, total_amount, payment_method, status, customer_id, created_at)
SELECT u.id, 99.99, 'cash', 'completed', c.id, NOW() - INTERVAL '14 days'
FROM users u, customers c
WHERE u.email = 'cashier@example.com' AND c.name = 'Humphrey Bogart';

INSERT INTO transactions (cashier_id, total_amount, payment_method, status, customer_id, created_at)
SELECT u.id, 149.50, 'card', 'completed', c.id, NOW() - INTERVAL '7 days'
FROM users u, customers c
WHERE u.email = 'cashier@example.com' AND c.name = 'Humphrey Bogart';

INSERT INTO transactions (cashier_id, total_amount, payment_method, status, customer_id, created_at)
SELECT u.id, 45.00, 'mobile', 'completed', c.id, NOW() - INTERVAL '3 days'
FROM users u, customers c
WHERE u.email = 'cashier@example.com' AND c.name = 'Humphrey Bogart';

INSERT INTO transactions (cashier_id, total_amount, payment_method, status, customer_id, created_at)
SELECT u.id, 199.99, 'card', 'completed', c.id, NOW() - INTERVAL '10 days'
FROM users u, customers c
WHERE u.email = 'cashier@example.com' AND c.name = 'Audrey Hepburn';

INSERT INTO transactions (cashier_id, total_amount, payment_method, status, customer_id, created_at)
SELECT u.id, 24.99, 'cash', 'completed', c.id, NOW() - INTERVAL '1 day'
FROM users u, customers c
WHERE u.email = 'cashier@example.com' AND c.name = 'Audrey Hepburn';
