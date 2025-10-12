const { createClient } = require('@supabase/supabase-js');

// Use the service role key to bypass RLS for adding sample data
const supabaseUrl = 'https://rgmmbwpyvebqsqdeaprb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbW1id3B5dmVicXNxZGVhcHJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzMzI0MSwiZXhwIjoyMDc1MjA5MjQxfQ.ejdwFX4BW27BJ9F8Z7BniiwFNjpgLKGM7kkKQohYbrc';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleProducts() {
  console.log('=== Adding Sample Products ===\n');
  
  // Sample products data
  const sampleProducts = [
    {
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 99.99,
      category: 'Electronics',
      stock_quantity: 25,
      barcode: '123456789012'
    },
    {
      name: 'Smartphone Case',
      description: 'Durable case for the latest smartphones',
      price: 24.99,
      category: 'Accessories',
      stock_quantity: 100,
      barcode: '234567890123'
    },
    {
      name: 'USB-C Cable',
      description: 'Fast charging USB-C cable, 2m length',
      price: 12.99,
      category: 'Accessories',
      stock_quantity: 75,
      barcode: '345678901234'
    },
    {
      name: 'Bluetooth Speaker',
      description: 'Portable Bluetooth speaker with excellent sound quality',
      price: 79.99,
      category: 'Electronics',
      stock_quantity: 30,
      barcode: '456789012345'
    },
    {
      name: 'Laptop Stand',
      description: 'Adjustable aluminum laptop stand',
      price: 45.99,
      category: 'Accessories',
      stock_quantity: 15,
      barcode: '567890123456'
    },
    {
      name: 'Gaming Mouse',
      description: 'Ergonomic gaming mouse with customizable RGB lighting',
      price: 59.99,
      category: 'Electronics',
      stock_quantity: 40,
      barcode: '678901234567'
    },
    {
      name: 'Mechanical Keyboard',
      description: 'Tenkeyless mechanical keyboard with blue switches',
      price: 89.99,
      category: 'Electronics',
      stock_quantity: 20,
      barcode: '789012345678'
    },
    {
      name: 'Webcam',
      description: '1080p HD webcam with built-in microphone',
      price: 69.99,
      category: 'Electronics',
      stock_quantity: 35,
      barcode: '890123456789'
    }
  ];
  
  try {
    console.log('Adding sample products to the database...');
    
    // Insert sample products
    const { data, error } = await supabase
      .from('products')
      .insert(sampleProducts)
      .select();
      
    if (error) {
      console.error('❌ Error adding sample products:', error.message);
      return;
    }
    
    console.log(`✅ Successfully added ${data.length} sample products:`);
    data.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price} (${product.stock_quantity} in stock)`);
    });
    
    console.log('\n=== Sample Products Added ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addSampleProducts();