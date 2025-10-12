const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSampleCashier() {
  console.log('=== Adding Sample Cashier ===\n');
  
  try {
    // Add a sample cashier to the public.cashiers table
    console.log('Adding sample cashier to public.cashiers table...');
    const { data, error } = await supabase
      .from('cashiers')
      .insert({
        username: 'testcashier',
        password: 'TestPassword123!',
        email: 'testcashier@example.com',
        is_active: true,
        deleted_at: null
      })
      .select();

    if (error) {
      console.error('❌ Error adding sample cashier:', error.message);
      console.error('Error details:', error);
      return;
    }
    
    console.log('✅ Successfully added sample cashier');
    console.log('Cashier details:');
    console.log('  Username:', data[0].username);
    console.log('  Email:', data[0].email);
    console.log('  ID:', data[0].id);
    
    console.log('\nYou can now test the login with:');
    console.log('  Username: testcashier');
    console.log('  Password: TestPassword123!');
    
    console.log('\n=== Sample Cashier Added ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addSampleCashier();