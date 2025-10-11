-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Admins and Cashiers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'cashier')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Insert sample data
-- Sample users
INSERT INTO users (email, password, role) VALUES 
('admin@example.com', 'Password123', 'admin'),
('cashier@example.com', 'Password123', 'cashier');

-- Sample products
INSERT INTO products (name, description, price, category, stock_quantity, barcode) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 99.99, 'Electronics', 25, '123456789012'),
('Smartphone Case', 'Durable case for the latest smartphones', 24.99, 'Accessories', 100, '234567890123'),
('USB-C Cable', 'Fast charging USB-C cable, 2m length', 12.99, 'Accessories', 75, '345678901234'),
('Bluetooth Speaker', 'Portable Bluetooth speaker with excellent sound quality', 79.99, 'Electronics', 30, '456789012345'),
('Laptop Stand', 'Adjustable aluminum laptop stand', 45.99, 'Accessories', 15, '567890123456');