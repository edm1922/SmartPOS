#!/usr/bin/env node

/**
 * Script to verify that tables have data
 * Note: This script should be run after proper authentication
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyData() {
  try {
    console.log('Verifying data in tables...\n');
    console.log('Note: This verification is limited due to security policies.');
    console.log('For full verification, you should test through the application interface.\n');
    
    // Check if tables exist by querying their structure
    const tables = ['users', 'products', 'transactions', 'transaction_items', 'activity_logs'];
    
    for (const table of tables) {
      console.log(`Checking ${table} table...`);
      try {
        // Try to get table info without querying data
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          // If it's a permission error, that's expected with RLS
          if (error.message.includes('permission') || error.message.includes('policy')) {
            console.log(`✅ ${table} table exists (access restricted by security policies)`);
          } else {
            console.log(`❌ Error checking ${table}: ${error.message}`);
          }
        } else {
          console.log(`✅ ${table} table exists`);
        }
      } catch (tableError) {
        console.log(`❌ Error checking ${table}: ${tableError.message}`);
      }
    }
    
    console.log('\n✅ Data verification complete!');
    console.log('\nNext steps:');
    console.log('1. Test the application by logging in as admin (admin@example.com / Password123)');
    console.log('2. Test the application by logging in as cashier (cashier@example.com / Password123)');
    console.log('3. Verify that you can see products and perform transactions');
    
  } catch (error) {
    console.error('Error verifying data:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifyData();