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

async function verifyCashiers() {
  console.log('=== Verifying Cashiers Data ===\n');
  
  try {
    // Check if we can connect to Supabase at all
    console.log('1. Testing Supabase connection...');
    const { data: test, error: testError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');

    // Check the cashiers table structure
    console.log('2. Checking cashiers table structure...');
    const { data: structure, error: structureError } = await supabase
      .from('cashiers')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Error accessing cashiers table:', structureError.message);
      // Let's try to see what tables exist
      console.log('\nTrying to list available tables...');
      // This is a workaround to see what tables exist
      const tablesToCheck = ['cashiers', 'users', 'products', 'transactions', 'transaction_items'];
      
      for (const table of tablesToCheck) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .limit(1);
            
          if (error) {
            console.log(`   ${table}: ❌ Access denied or doesn't exist - ${error.message}`);
          } else {
            console.log(`   ${table}: ✅ Accessible`);
          }
        } catch (e) {
          console.log(`   ${table}: ❌ Error - ${e.message}`);
        }
      }
      return;
    }
    
    console.log('✅ Cashiers table accessible');
    
    // Fetch all cashiers with all columns
    console.log('\n3. Fetching all cashiers with full details...');
    const { data: allCashiers, error: allError } = await supabase
      .from('cashiers')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching cashiers:', allError.message);
      return;
    }
    
    console.log(`Found ${allCashiers.length} cashier records:`);
    if (allCashiers.length > 0) {
      allCashiers.forEach((cashier, index) => {
        console.log(`\n   Cashier ${index + 1}:`);
        Object.keys(cashier).forEach(key => {
          if (key === 'password') {
            console.log(`     ${key}: [HIDDEN]`);
          } else {
            console.log(`     ${key}: ${cashier[key]}`);
          }
        });
      });
    } else {
      console.log('   No cashiers found in the table');
    }
    
    // Try a specific query for a cashier
    console.log('\n4. Testing specific cashier query...');
    const testUsername = 'cashier1'; // Common test username
    const { data: specificCashier, error: specificError } = await supabase
      .from('cashiers')
      .select('id, username, password')
      .eq('username', testUsername)
      .is('deleted_at', null)
      .is('is_active', true)
      .single();

    if (specificError) {
      console.log(`   No cashier found with username '${testUsername}'`);
    } else if (specificCashier) {
      console.log(`   Found cashier '${testUsername}':`);
      console.log(`     ID: ${specificCashier.id}`);
      console.log(`     Username: ${specificCashier.username}`);
      console.log(`     Password: [HIDDEN]`);
    } else {
      console.log(`   No cashier found with username '${testUsername}'`);
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyCashiers();