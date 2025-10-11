#!/usr/bin/env node

/**
 * Script to check if security policies are applied to tables
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

async function checkSecurity() {
  try {
    console.log('Checking security policies on tables...\n');
    
    // List of expected tables
    const tables = ['users', 'products', 'transactions', 'transaction_items', 'activity_logs'];
    
    for (const table of tables) {
      try {
        // Check if RLS is enabled
        const { data: rlsData, error: rlsError } = await supabase
          .from('pg_tables')
          .select('relrowsecurity')
          .eq('tablename', table)
          .eq('schemaname', 'public')
          .single();
        
        if (rlsError) {
          console.log(`❌ Error checking RLS for table '${table}': ${rlsError.message}`);
        } else {
          if (rlsData && rlsData.relrowsecurity) {
            console.log(`✅ RLS enabled for table '${table}'`);
          } else {
            console.log(`❌ RLS NOT enabled for table '${table}'`);
          }
        }
      } catch (tableError) {
        console.log(`❌ Error checking table '${table}': ${tableError.message}`);
      }
    }
    
    console.log('\nTo apply security policies:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/security_policies.sql');
    console.log('4. Click "Run"');
    
  } catch (error) {
    console.error('Error checking security:', error.message);
    process.exit(1);
  }
}

// Run the check
checkSecurity();