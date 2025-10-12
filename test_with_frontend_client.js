const { createClient } = require('@supabase/supabase-js');

// Use the exact same configuration as the frontend
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzMyNDEsImV4cCI6MjA3NTIwOTI0MX0.zGWd1L745Zq-NUn_Ll0Fn5nxCm77-IZttNoLvx-bog8';

// Create Supabase client with the same credentials as the frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithFrontendClient() {
  console.log('=== Testing with Frontend Client Configuration ===\n');
  
  try {
    // Test the exact same query as used in the login page
    console.log('Testing the exact login query with frontend client...');
    const { data: cashierData, error: cashierError } = await supabase
      .from('cashiers')
      .select('id, username, password')
      .eq('username', 'testcashier')
      .is('deleted_at', null)
      .is('is_active', true)
      .single();

    if (cashierError) {
      console.error('❌ Frontend client query failed:', cashierError);
      console.error('Error details:', {
        message: cashierError.message,
        code: cashierError.code,
        hint: cashierError.hint,
        details: cashierError.details
      });
      
      // Let's also try a simpler query to see if we can access the table at all
      console.log('\nTrying a simpler query to test table access...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('cashiers')
        .select('id, username');
        
      if (simpleError) {
        console.error('❌ Even simple query failed:', simpleError.message);
        console.log('This confirms that RLS policies are blocking access.');
      } else {
        console.log(`✅ Simple query succeeded, found ${simpleData.length} records`);
        simpleData.forEach((cashier, index) => {
          console.log(`  ${index + 1}. ${cashier.username}`);
        });
      }
    } else {
      console.log('✅ Frontend client query succeeded:');
      console.log('  ID:', cashierData.id);
      console.log('  Username:', cashierData.username);
      console.log('  Password:', cashierData.password);
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testWithFrontendClient();