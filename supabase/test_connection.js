#!/usr/bin/env node

/**
 * Script to test the Supabase connection
 * 
 * Usage:
 * 1. Make sure you have the required environment variables in your .env file:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 2. Run: node supabase/test_connection.js
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

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection by getting the Supabase auth status
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('✗ Connection failed:', error.message);
      process.exit(1);
    } else {
      console.log('✓ Connection successful!');
      console.log('Supabase client is properly configured');
      console.log('\nNext steps:');
      console.log('1. Run the schema push script: node supabase/push_schema.js');
      console.log('2. Or manually create tables using the Supabase dashboard');
    }
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testConnection();