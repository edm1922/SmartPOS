// Simple test script to verify product deletion
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
  try {
    console.log('Testing product deletion...');
    
    // First, let's list all products
    console.log('Fetching all products...');
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return;
    }
    
    console.log(`Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`- ${product.id}: ${product.name}`);
    });
    
    if (products.length === 0) {
      console.log('No products to delete.');
      return;
    }
    
    // Try to delete the first product
    const productToDelete = products[0];
    console.log(`\nAttempting to delete product: ${productToDelete.id} (${productToDelete.name})`);
    
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productToDelete.id);
    
    if (error) {
      console.error('Error deleting product:', error);
      return;
    }
    
    console.log('Delete operation result:', data);
    console.log('Product deleted successfully!');
    
    // Verify the product is gone
    console.log('\nVerifying deletion...');
    const { data: remainingProducts, error: verifyError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productToDelete.id);
    
    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
      return;
    }
    
    if (remainingProducts.length === 0) {
      console.log('Verification successful: Product is no longer in the database.');
    } else {
      console.log('Verification failed: Product still exists in the database.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDelete();