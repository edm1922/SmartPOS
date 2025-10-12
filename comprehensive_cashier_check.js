const { createClient } = require('@supabase/supabase-js');

// Use the service role key to bypass RLS for inspection
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzMzI0MSwiZXhwIjoyMDc1MjA5MjQxfQ.ejdwFX4BW27BJ9F8Z7BniiwFNjpgLKGM7kkKQohYbrc';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function comprehensiveCashierCheck() {
  console.log('=== Comprehensive Cashier Check ===\n');
  
  try {
    // First, let's get all cashiers with all fields
    console.log('1. Fetching all cashiers with all fields...');
    const { data: allCashiers, error: allError } = await supabase
      .from('cashiers')
      .select('*');
      
    if (allError) {
      console.error('Error fetching all cashiers:', allError);
      return;
    }
    
    console.log(`Found ${allCashiers.length} total cashier records:`);
    allCashiers.forEach((cashier, index) => {
      console.log(`\n   Cashier ${index + 1}:`);
      console.log(`     ID: ${cashier.id}`);
      console.log(`     Username: "${cashier.username}"`);
      console.log(`     Password: "${cashier.password}"`);
      console.log(`     Email: ${cashier.email}`);
      console.log(`     Created at: ${cashier.created_at}`);
      console.log(`     Updated at: ${cashier.updated_at}`);
      console.log(`     Deleted at: ${cashier.deleted_at}`);
      console.log(`     Is active: ${cashier.is_active}`);
    });
    
    // Now let's test the specific query that the login uses
    console.log('\n\n2. Testing the exact login query conditions...');
    const testUsername = 'testcashier';
    console.log(`Testing for username: "${testUsername}"`);
    
    const { data: loginQueryData, error: loginQueryError } = await supabase
      .from('cashiers')
      .select('id, username, password')
      .eq('username', testUsername)
      .is('deleted_at', null)
      .is('is_active', true)
      .single();
      
    if (loginQueryError) {
      console.log('Login query failed with error:', loginQueryError.message);
      console.log('Details:', loginQueryError);
      
      // Let's try a more permissive query to see what we get
      console.log('\n3. Trying a more permissive query...');
      const { data: permissiveData, error: permissiveError } = await supabase
        .from('cashiers')
        .select('id, username, password, is_active, deleted_at')
        .eq('username', testUsername);
        
      if (permissiveError) {
        console.error('Permissive query also failed:', permissiveError);
      } else {
        console.log(`Permissive query found ${permissiveData.length} records:`);
        permissiveData.forEach((cashier, index) => {
          console.log(`\n   Record ${index + 1}:`);
          console.log(`     ID: ${cashier.id}`);
          console.log(`     Username: "${cashier.username}"`);
          console.log(`     Password: "${cashier.password}"`);
          console.log(`     Is active: ${cashier.is_active}`);
          console.log(`     Deleted at: ${cashier.deleted_at}`);
        });
      }
    } else {
      console.log('Login query succeeded:');
      console.log('  ID:', loginQueryData.id);
      console.log('  Username:', loginQueryData.username);
      console.log('  Password:', loginQueryData.password);
    }
    
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

comprehensiveCashierCheck();