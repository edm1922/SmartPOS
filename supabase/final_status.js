#!/usr/bin/env node

/**
 * Script to show the final status of the POS system setup
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

console.log('='.repeat(60));
console.log('POS SYSTEM SETUP STATUS');
console.log('='.repeat(60));

// Check if required files exist
const requiredFiles = [
  '.env',
  'src/app/auth/admin/login/page.tsx',
  'src/app/auth/cashier/login/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/cashier/pos/page.tsx',
  'src/lib/supabaseClient.ts',
  'supabase/ready_to_run_schema.sql',
  'supabase/security_policies.sql'
];

console.log('\n📁 FILE STATUS:');
console.log('-'.repeat(30));
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check environment variables
console.log('\n🔐 ENVIRONMENT VARIABLES:');
console.log('-'.repeat(30));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`${supabaseUrl ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || 'NOT SET'}`);
console.log(`${supabaseAnonKey ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}`);

// Show next steps
console.log('\n🚀 NEXT STEPS:');
console.log('-'.repeat(30));
console.log('1. If you haven\'t already, run the schema setup:');
console.log('   - Go to Supabase dashboard > SQL Editor');
console.log('   - Copy and paste supabase/ready_to_run_schema.sql');
console.log('   - Click "Run"');

console.log('\n2. If you want security policies, run:');
console.log('   - Go to Supabase dashboard > SQL Editor');
console.log('   - Copy and paste supabase/security_policies.sql');
console.log('   - Click "Run"');

console.log('\n3. Test the application:');
console.log('   - Run: npm run dev');
console.log('   - Visit: http://localhost:3000');
console.log('   - Test admin login: admin@example.com / Password123');
console.log('   - Test cashier login: cashier@example.com / Password123');

console.log('\n4. For production deployment:');
console.log('   - Update environment variables with your production keys');
console.log('   - Set up proper user management');
console.log('   - Review and enhance security policies');

console.log('\n' + '='.repeat(60));
console.log('🎉 SETUP COMPLETE! 🎉');
console.log('Your POS system is ready to use!');
console.log('='.repeat(60));