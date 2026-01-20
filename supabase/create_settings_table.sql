-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_phone TEXT NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,
  currency_code TEXT DEFAULT 'PHP',
  receipt_header TEXT,
  receipt_footer TEXT,
  show_tax_on_receipt BOOLEAN DEFAULT TRUE,
  show_address_on_receipt BOOLEAN DEFAULT TRUE,
  show_phone_on_receipt BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if none exist
INSERT INTO settings (store_name, store_address, store_phone, tax_rate, currency_code)
SELECT 'AJ Softdrive POS', '123 Business Street, Metro Manila', '+63 912 345 6789', 12.00, 'PHP'
WHERE NOT EXISTS (SELECT 1 FROM settings);