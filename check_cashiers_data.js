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

async function checkCashiersData() {
  console.log('=== Checking Cashiers Data ===\n');
  
  try {
    // Fetch all cashiers without any filters to see all records
    console.log('1. Fetching ALL cashiers (no filters):');
    const { data: allCashiers, error: allError } = await supabase
      .from('cashiers')
      .select('id, username, email, created_at, is_active, deleted_at');
      
    if (allError) {
      console.error('Error fetching all cashiers:', allError.message);
      return;
    }
    
    console.log(`Found ${allCashiers.length} total cashier records:`);
    allCashiers.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
      console.log(`     ID: ${cashier.id}`);
      console.log(`     Active: ${cashier.is_active}`);
      console.log(`     Created: ${cashier.created_at}`);
      console.log(`     Deleted: ${cashier.deleted_at || 'Not deleted'}`);
      console.log('');
    });
    
    // Fetch only active cashiers (this is what the app should show)
    console.log('2. Fetching only ACTIVE cashiers (is_active = true AND deleted_at IS NULL):');
    const { data: activeCashiers, error: activeError } = await supabase
      .from('cashiers')
      .select('id, username, email, created_at, is_active, deleted_at')
      .is('deleted_at', null)
      .eq('is_active', true);
      
    if (activeError) {
      console.error('Error fetching active cashiers:', activeError.message);
      return;
    }
    
    console.log(`Found ${activeCashiers.length} active cashier records:`);
    activeCashiers.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
    });
    
    // Fetch soft-deleted cashiers
    console.log('\n3. Fetching only SOFT-DELETED cashiers (deleted_at IS NOT NULL):');
    const { data: deletedCashiers, error: deletedError } = await supabase
      .from('cashiers')
      .select('id, username, email, created_at, is_active, deleted_at')
      .not('deleted_at', 'is', null);
      
    if (deletedError) {
      console.error('Error fetching deleted cashiers:', deletedError.message);
      return;
    }
    
    if (deletedCashiers.length === 0) {
      console.log('No soft-deleted cashiers found.');
    } else {
      console.log(`Found ${deletedCashiers.length} soft-deleted cashier records:`);
      deletedCashiers.forEach((cashier, index) => {
        console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
        console.log(`     Deleted at: ${cashier.deleted_at}`);
      });
    }
    
    console.log('\n=== End of Report ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkCashiersData();
