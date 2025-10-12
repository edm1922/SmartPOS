const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as the application
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzMyNDEsImV4cCI6MjA3NTIwOTI0MX0.zGWd1L745Zq-NUn_Ll0Fn5nxCm77-IZttNoLvx-bog8';

// Create Supabase client with the same credentials as the frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCashierLogin() {
  console.log('=== Testing Cashier Login Query ===\n');
  
  const username = 'testcashier';
  const password = 'TestPassword123!';
  
  console.log(`Testing login for username: ${username}`);
  console.log(`Password: ${password}\n`);
  
  try {
    // Simulate the exact query used in the login page
    console.log('Executing the same query as the login page...');
    const { data: cashierData, error: cashierError } = await supabase
      .from('cashiers')
      .select('id, username, password')
      .eq('username', username)
      .is('deleted_at', null)
      .is('is_active', true)
      .single();

    if (cashierError) {
      console.error('❌ Database error when fetching cashier:', cashierError);
      console.error('Error details:', {
        message: cashierError.message,
        code: cashierError.code,
        hint: cashierError.hint,
        details: cashierError.details
      });
      return;
    }

    if (!cashierData) {
      console.log('❌ Cashier not found with username:', username);
      // Let's check what cashiers actually exist
      console.log('\nChecking all active cashiers...');
      const { data: allCashiers, error: allError } = await supabase
        .from('cashiers')
        .select('id, username, is_active, deleted_at')
        .is('deleted_at', null)
        .is('is_active', true);
        
      if (allError) {
        console.error('Error fetching all cashiers:', allError);
      } else {
        console.log(`Found ${allCashiers.length} active cashiers:`);
        allCashiers.forEach((cashier, index) => {
          console.log(`  ${index + 1}. ${cashier.username} (ID: ${cashier.id})`);
        });
      }
      return;
    }

    console.log('✅ Cashier found:');
    console.log('  ID:', cashierData.id);
    console.log('  Username:', cashierData.username);
    console.log('  Stored password:', cashierData.password);
    
    // Check password match
    console.log('\nChecking password match...');
    if (cashierData.password === password) {
      console.log('✅ Password matches!');
      console.log('Login should be successful with these credentials.');
    } else {
      console.log('❌ Password mismatch!');
      console.log('  Expected:', password);
      console.log('  Found:', cashierData.password);
      console.log('Login will fail due to password mismatch.');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testCashierLogin();