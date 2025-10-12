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

async function testCashiersTable() {
  console.log('Testing cashiers table...');
  
  try {
    // Test 1: Check if cashiers table exists by querying it
    console.log('Test 1: Checking if cashiers table exists...');
    const { data, error } = await supabase
      .from('cashiers')
      .select('id, username, email, created_at')
      .limit(1);

    if (error) {
      console.error('Error querying cashiers table:', error);
      console.error('This indicates the table might not exist or there are permission issues.');
      return;
    }

    console.log('✓ Cashiers table exists and is accessible');
    console.log('Sample data:', data);

    // Test 2: Count total cashiers
    console.log('\nTest 2: Counting total cashiers...');
    const { count, error: countError } = await supabase
      .from('cashiers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting cashiers:', countError);
    } else {
      console.log(`✓ Total cashiers in table: ${count}`);
    }

    // Test 3: Check table structure (this is a workaround since we can't directly describe tables)
    console.log('\nTest 3: Checking table structure...');
    const structureTest = await supabase
      .from('cashiers')
      .select('id, username, password, email, created_at, updated_at, deleted_at, is_active')
      .limit(1);

    if (structureTest.error) {
      console.error('Error testing table structure:', structureTest.error);
    } else {
      console.log('✓ Table structure appears correct');
    }

  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }
}

testCashiersTable();