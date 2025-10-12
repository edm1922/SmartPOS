const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from environment variables
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzMyNDEsImV4cCI6MjA3NTIwOTI0MX0.zGWd1L745Zq-NUn_Ll0Fn5nxCm77-IZttNoLvx-bog8';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCashiersStructure() {
  console.log('=== Checking Cashiers Table Structure ===\n');
  
  try {
    // Try to fetch one record to understand the structure
    console.log('Fetching sample cashier record...');
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error accessing cashiers table:', error.message);
      return;
    }
    
    if (data.length === 0) {
      console.log('No records found in cashiers table.');
      return;
    }
    
    console.log('Sample cashier record:');
    console.log(JSON.stringify(data[0], null, 2));
    
    // Get column information
    console.log('\nColumn information:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  ${key}: ${typeof data[0][key]}`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkCashiersStructure();