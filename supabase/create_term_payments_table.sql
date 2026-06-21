-- Create term_payments table for recording incoming term payments
CREATE TABLE IF NOT EXISTS term_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  cashier_id UUID REFERENCES cashiers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create term_payment_allocations table (FIFO tracking)
CREATE TABLE IF NOT EXISTS term_payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term_payment_id UUID NOT NULL REFERENCES term_payments(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_term_payments_customer ON term_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_term_payments_cashier ON term_payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_term_payment_allocations_payment ON term_payment_allocations(term_payment_id);
CREATE INDEX IF NOT EXISTS idx_term_payment_allocations_tx ON term_payment_allocations(transaction_id);

-- RLS
ALTER TABLE term_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON term_payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON term_payment_allocations
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE term_payments IS 'Records incoming payments against term/installment transactions';
COMMENT ON TABLE term_payment_allocations IS 'FIFO allocation of term payments to individual transactions';
