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

async function checkPublicCashiers() {
  console.log('=== Checking public.cashiers table ===\n');
  
  try {
    // Specifically check the public.cashiers table
    console.log('Fetching data from public.cashiers table...');
    const { data, error } = await supabase
      .from('cashiers')
      .select('*');

    if (error) {
      console.error('❌ Error accessing public.cashiers table:', error.message);
      console.error('Error details:', error);
      return;
    }
    
    console.log(`✅ Successfully accessed public.cashiers table`);
    console.log(`Found ${data.length} records in public.cashiers table:`);
    
    if (data.length > 0) {
      data.forEach((cashier, index) => {
        console.log(`\n   Record ${index + 1}:`);
        Object.keys(cashier).forEach(key => {
          // Hide password for security
          if (key === 'password') {
            console.log(`     ${key}: [HIDDEN]`);
          } else {
            console.log(`     ${key}: ${cashier[key]}`);
          }
        });
      });
    } else {
      console.log('   No records found in public.cashiers table');
    }
    
    // Let's also check the table structure
    console.log('\n=== Checking table structure ===');
    // We can't directly get table schema, but we can try to understand it from the data
    if (data.length > 0) {
      console.log('Columns in the cashiers table:');
      Object.keys(data[0]).forEach(column => {
        console.log(`   - ${column}`);
      });
    } else {
      console.log('   Unable to determine table structure (no data)');
    }
    
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPublicCashiers();