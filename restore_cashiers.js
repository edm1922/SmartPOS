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

async function restoreCashiers() {
  console.log('=== Restoring Cashiers ===\n');
  
  try {
    // Update all cashiers to set is_active = true and deleted_at = null
    console.log('Restoring all soft-deleted cashiers...');
    const { data, error } = await supabase
      .from('cashiers')
      .update({ 
        is_active: true,
        deleted_at: null
      })
      .not('deleted_at', 'is', null)  // Only update records that are currently soft-deleted
      .select('id, username, email');
      
    if (error) {
      console.error('Error restoring cashiers:', error.message);
      return;
    }
    
    console.log(`Successfully restored ${data.length} cashiers:`);
    data.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
    });
    
    console.log('\n=== Restoration Complete ===');
    console.log('Refresh your admin dashboard to see the restored cashiers.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

restoreCashiers();