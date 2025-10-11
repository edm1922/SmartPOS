#!/usr/bin/env node

/**
 * Script to check if tables exist in Supabase
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

async function checkTables() {
  try {
    console.log('Checking if tables exist in Supabase...\n');
    
    // List of expected tables
    const tables = ['users', 'products', 'transactions', 'transaction_items', 'activity_logs'];
    
    for (const table of tables) {
      try {
        // Try to query the table with a limit of 1 row
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('not found') || error.message.includes('does not exist')) {
            console.log(`❌ Table '${table}' does not exist`);
          } else {
            console.log(`❌ Error checking table '${table}': ${error.message}`);
          }
        } else {
          // Get the actual count
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact' });
          
          if (countError) {
            console.log(`✅ Table '${table}' exists (unable to get count: ${countError.message})`);
          } else {
            console.log(`✅ Table '${table}' exists (${count.length} rows)`);
          }
        }
      } catch (tableError) {
        console.log(`❌ Error checking table '${table}': ${tableError.message}`);
      }
    }
    
    console.log('\nIf any tables are missing, you need to run the schema setup:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/ready_to_run_schema.sql');
    console.log('4. Click "Run"');
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
    process.exit(1);
  }
}

// Run the check
checkTables();