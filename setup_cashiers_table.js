const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCashiersTable() {
  console.log('Setting up cashiers table...');

  // SQL to create cashiers table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS cashiers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      is_active BOOLEAN DEFAULT TRUE
    );

    CREATE INDEX IF NOT EXISTS idx_cashiers_username ON cashiers(username);
    CREATE INDEX IF NOT EXISTS idx_cashiers_is_active ON cashiers(is_active);
  `;

  // SQL to insert sample cashiers
  const insertSampleCashiersSQL = `
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
  `;

  try {
    console.log('Creating cashiers table...');
    // Note: Supabase JS client doesn't directly support raw SQL execution
    // We'll need to use the REST API or dashboard for this
    
    console.log('Please execute the following SQL in your Supabase SQL editor:');
    console.log('\n--- CREATE TABLE SQL ---');
    console.log(createTableSQL);
    console.log('\n--- INSERT SAMPLE DATA SQL ---');
    console.log(insertSampleCashiersSQL);
    
    console.log('\nAfter executing the SQL, restart your application to see the cashiers.');
    
  } catch (error) {
    console.error('Error setting up cashiers table:', error);
  }
}

setupCashiersTable();