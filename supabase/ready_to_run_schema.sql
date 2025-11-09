-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Admins and Cashiers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'cashier')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  barcode TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID REFERENCES users(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'mobile')) NOT NULL,
  status TEXT CHECK (status IN ('completed', 'cancelled', 'pending')) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction items table (items in each transaction)
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_phone TEXT NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,
  currency_code TEXT DEFAULT 'PHP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
-- Sample users (use secure passwords in production)
INSERT INTO users (email, username, password, role) VALUES 
('admin@example.com', 'admin', 'Password123', 'admin'),
('cashier@example.com', 'cashier', 'Password123', 'cashier');

-- Sample products
INSERT INTO products (name, description, price, category, stock_quantity, barcode) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 99.99, 'Electronics', 25, '123456789012'),
('Smartphone Case', 'Durable case for the latest smartphones', 24.99, 'Accessories', 100, '234567890123'),
('USB-C Cable', 'Fast charging USB-C cable, 2m length', 12.99, 'Accessories', 75, '345678901234'),
('Bluetooth Speaker', 'Portable Bluetooth speaker with excellent sound quality', 79.99, 'Electronics', 30, '456789012345'),
('Laptop Stand', 'Adjustable aluminum laptop stand', 45.99, 'Accessories', 15, '567890123456');

-- Default settings
INSERT INTO settings (store_name, store_address, store_phone, tax_rate, currency_code)
SELECT 'AJ Softdrive POS', '123 Business Street, Metro Manila', '+63 912 345 6789', 12.00, 'PHP'
WHERE NOT EXISTS (SELECT 1 FROM settings);