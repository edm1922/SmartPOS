const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzMzI0MSwiZXhwIjoyMDc1MjA5MjQxfQ.ejdwFX4BW27BJ9F8Z7BniiwFNjpgLKGM7kkKQohYbrc';

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTestCashier() {
  console.log('=== Verifying Test Cashier ===\n');
  
  try {
    // Check specifically for the test cashier we added
    console.log("Checking for test cashier 'testcashier'...");
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('username', 'testcashier');

    if (error) {
      console.error('❌ Error querying for test cashier:', error.message);
      return;
    }
    
    if (data.length > 0) {
      console.log('✅ Found test cashier:');
      console.log('  Username:', data[0].username);
      console.log('  Email:', data[0].email);
      console.log('  ID:', data[0].id);
      console.log('  Created at:', data[0].created_at);
    } else {
      console.log('❌ Test cashier not found');
    }
    
    // Let's also try a broader query
    console.log('\nChecking all cashiers...');
    const { data: allData, error: allError } = await supabase
      .from('cashiers')
      .select('*');

    if (allError) {
      console.error('❌ Error querying all cashiers:', allError.message);
      return;
    }
    
    console.log(`Found ${allData.length} total cashiers:`);
    allData.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
    });
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyTestCashier();