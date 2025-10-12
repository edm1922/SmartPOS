const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzMzI0MSwiZXhwIjoyMDc1MjA5MjQxfQ.ejdwFX4BW27BJ9F8Z7BniiwFNjpgLKGM7kkKQohYbrc';

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleCashier() {
  console.log('=== Adding Sample Cashier with Admin Privileges ===\n');
  
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