# Supabase Setup Guide

This guide will help you set up the Supabase database for the POS system.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project

## Database Setup

### Option 1: Automated Setup (Using Node.js script)

1. Make sure you have updated your `.env` file with your Supabase project credentials
2. Run the setup script:
   ```bash
   node supabase/push_schema.js
   ```

### Option 2: Manual Setup (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to the SQL editor (left sidebar > SQL Editor)
3. Copy and paste the contents of `supabase/ready_to_run_schema.sql` into the editor
4. Click "Run" to execute the SQL commands

### Option 3: Step-by-step Manual Setup

#### 1. Enable UUID Extension

In the Supabase SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### 2. Create Database Tables

Run the following SQL commands in the Supabase SQL editor:

```sql
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
```

#### 3. Insert Sample Data

```sql
-- Sample users (use secure passwords in production)
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
```

## Environment Variables

Update your `.env` file with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project dashboard under "Project Settings" > "API".

## Authentication Setup

1. In your Supabase project, go to "Authentication" > "Settings"
2. Disable "Enable email confirmations" for development (optional)
3. Set up any additional authentication providers as needed

## Real-time Setup

The application uses Supabase real-time features for product updates. This is enabled by default when you use the `supabase.channel` API.

## Security Setup (Important)

For production use, you should apply security policies to restrict access to your tables:

1. In the Supabase SQL editor, copy and paste the contents of `supabase/security_policies.sql`
2. Click "Run" to apply security policies

This will:
- Enable Row Level Security (RLS) on all tables
- Restrict access based on user roles (admin vs cashier)
- Prevent unauthorized access to sensitive data

## Testing the Setup

1. Start your Next.js application:
   ```bash
   npm run dev
   ```

2. Navigate to the admin login page:
   http://localhost:3000/auth/admin/login

3. Log in with:
   - Email: admin@example.com
   - Password: Password123

4. Navigate to the cashier login page:
   http://localhost:3000/auth/cashier/login

5. Log in with:
   - Email: cashier@example.com
   - Password: Password123

If everything is set up correctly, you should be able to:
- Log in as admin and manage products
- Log in as cashier and use the POS terminal
- See real-time updates when products are modified