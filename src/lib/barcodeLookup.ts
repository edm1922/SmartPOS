// Mock service for barcode lookup - in a real application, you would integrate with a barcode database API
// Examples of such services include:
// - UPCitemdb API
// - BarcodeLookup API
// - ProductOpen API

interface ProductInfo {
  name: string;
  description?: string;
  category?: string;
  price?: number;
}

// Mock database of products for demonstration
const MOCK_PRODUCT_DATABASE: Record<string, ProductInfo> = {
  '123456789012': {
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    category: 'Electronics',
    price: 99.99
  },
  '234567890123': {
    name: 'Smartphone Case',
    description: 'Durable case for the latest smartphones',
    category: 'Accessories',
    price: 24.99
  },
  '345678901234': {
    name: 'USB-C Cable',
    description: 'Fast charging USB-C cable, 2m length',
    category: 'Accessories',
    price: 12.99
  },
  '456789012345': {
    name: 'Bluetooth Speaker',
    description: 'Portable Bluetooth speaker with excellent sound quality',
    category: 'Electronics',
    price: 79.99
  },
  '567890123456': {
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand',
    category: 'Accessories',
    price: 45.99
  },
  '678901234567': {
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with thermal carafe',
    category: 'Appliances',
    price: 89.99
  },
  '789012345678': {
    name: 'Desk Lamp',
    description: 'LED desk lamp with adjustable brightness',
    category: 'Lighting',
    price: 34.99
  },
  '890123456789': {
    name: 'Water Bottle',
    description: 'Insulated stainless steel water bottle',
    category: 'Household',
    price: 29.99
  },
  '901234567890': {
    name: 'Fitness Tracker',
    description: 'Wearable fitness tracker with heart rate monitor',
    category: 'Electronics',
    price: 129.99
  },
  '012345678901': {
    name: 'Backpack',
    description: 'Water-resistant backpack with laptop compartment',
    category: 'Bags',
    price: 59.99
  }
};

/**
 * Lookup product information by barcode
 * In a real application, this would make an API call to a barcode database service
 * @param barcode The barcode to lookup
 * @returns Product information or null if not found
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if we have the product in our mock database
  const product = MOCK_PRODUCT_DATABASE[barcode];
  
  if (product) {
    return { ...product };
  }
  
  // For demonstration, we'll return a generic product for any 12-digit barcode
  // In a real app, you would return null if not found
  if (barcode.length === 12 && /^\d+$/.test(barcode)) {
    return {
      name: `Product ${barcode}`,
      description: `Product with barcode ${barcode}`,
      category: 'General',
      price: parseFloat((Math.random() * 100).toFixed(2))
    };
  }
  
  // Product not found
  return null;
}

/**
 * Validate if a string is a valid barcode format
 * @param barcode The barcode to validate
 * @returns True if valid, false otherwise
 */
export function isValidBarcode(barcode: string): boolean {
  // Basic validation for common barcode formats
  return (
    (barcode.length === 12 && /^\d+$/.test(barcode)) || // UPC-A
    (barcode.length === 13 && /^\d+$/.test(barcode)) || // EAN-13
    (barcode.length === 8 && /^\d+$/.test(barcode))     // EAN-8
  );
}