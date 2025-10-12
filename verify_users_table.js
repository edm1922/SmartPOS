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

async function verifyUsers() {
  console.log('=== Verifying Users Data ===\n');
  
  try {
    // Fetch all users with all columns
    console.log('Fetching all users with full details...');
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching users:', allError.message);
      return;
    }
    
    console.log(`Found ${allUsers.length} user records:`);
    if (allUsers.length > 0) {
      allUsers.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        Object.keys(user).forEach(key => {
          if (key === 'password') {
            console.log(`     ${key}: [HIDDEN]`);
          } else {
            console.log(`     ${key}: ${user[key]}`);
          }
        });
      });
    } else {
      console.log('   No users found in the table');
    }
    
    // Check specifically for cashiers
    console.log('\nChecking specifically for cashiers...');
    const { data: cashiers, error: cashierError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'cashier');

    if (cashierError) {
      console.error('❌ Error fetching cashiers from users table:', cashierError.message);
      return;
    }
    
    console.log(`Found ${cashiers.length} cashier records in users table:`);
    if (cashiers.length > 0) {
      cashiers.forEach((cashier, index) => {
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
      console.log('   No cashiers found in users table');
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyUsers();