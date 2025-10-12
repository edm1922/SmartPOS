const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from environment variables
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzMyNDEsImV4cCI6MjA3NTIwOTI0MX0.zGWd1L745Zq-NUn_Ll0Fn5nxCm77-IZttNoLvx-bog8';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCashiersSecurity() {
  console.log('=== Testing Cashiers Table Security ===\n');
  
  try {
    // Test 1: Try to access cashiers table without authentication
    console.log('Test 1: Attempting to access cashiers without authentication...');
    const { data: unauthData, error: unauthError } = await supabase
      .from('cashiers')
      .select('*');
      
    if (unauthError) {
      console.log('✅ Access correctly denied without authentication');
      console.log('   Error:', unauthError.message);
    } else {
      console.log('❌ Access was allowed without authentication');
      console.log('   Data retrieved:', unauthData.length, 'records');
    }
    
    console.log('\nNote: To fully test security policies, you would need to:');
    console.log('1. Sign in as an admin user');
    console.log('2. Attempt operations with different user roles');
    console.log('3. Verify that RLS policies are correctly enforced');
    
    console.log('\n=== Security Test Summary ===');
    console.log('The cashiers table now has RLS policies that restrict access to admin users only.');
    console.log('These policies must be applied to your Supabase database by running the SQL file:');
    console.log('supabase/cashiers_security_policies.sql');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testCashiersSecurity();