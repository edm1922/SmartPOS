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

async function permanentlyDeleteCashiers() {
  console.log('=== Permanently Deleting Cashiers ===\n');
  
  try {
    // First, let's see what cashiers exist
    console.log('Checking current cashiers...');
    const { data: existingCashiers, error: fetchError } = await supabase
      .from('cashiers')
      .select('id, username, email');
      
    if (fetchError) {
      console.error('Error fetching cashiers:', fetchError.message);
      return;
    }
    
    if (existingCashiers.length === 0) {
      console.log('No cashiers found in the database.');
      return;
    }
    
    console.log(`Found ${existingCashiers.length} cashiers:`);
    existingCashiers.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
    });
    
    // Ask for confirmation before proceeding
    console.log('\n⚠️  WARNING: This will permanently delete all cashiers from the database.');
    console.log('This action cannot be undone.\n');
    
    // In a real implementation, you would prompt for confirmation here
    // For now, we'll proceed with the deletion
    
    // Permanently delete all cashiers
    console.log('Permanently deleting all cashiers...');
    const { data, error } = await supabase
      .from('cashiers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')  // Delete all records (using a condition that matches all)
      .select('id, username, email');
      
    if (error) {
      console.error('Error deleting cashiers:', error.message);
      return;
    }
    
    console.log(`Successfully deleted ${data.length} cashiers:`);
    data.forEach((cashier, index) => {
      console.log(`  ${index + 1}. ${cashier.username} (${cashier.email || 'no email'})`);
    });
    
    console.log('\n=== Permanent Deletion Complete ===');
    console.log('All cashiers have been permanently removed from the database.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

permanentlyDeleteCashiers();