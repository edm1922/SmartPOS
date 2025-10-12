// Test script for transaction creation
// Run this in the Supabase SQL editor or as a Node.js script

// Replace with actual cashier ID from your database
const TEST_CASHIER_ID = 'CASHIER_ID_HERE';

// Test transaction data
const testTransaction = {
  cashier_id: TEST_CASHIER_ID,
  total_amount: 99.99,
  payment_method: 'cash',
  status: 'completed'
};

// Test transaction items data
const testTransactionItems = [
  {
    transaction_id: null, // Will be set after transaction creation
    product_id: 'PRODUCT_ID_HERE',
    quantity: 2,
    price: 49.99
  }
];

console.log('Testing transaction creation...');

// 1. Create a transaction
const { data: transactionData, error: transactionError } = await supabase
  .from('transactions')
  .insert(testTransaction)
  .select()
  .single();

if (transactionError) {
  console.error('Failed to create transaction:', transactionError);
  process.exit(1);
}

console.log('Transaction created successfully:', transactionData);

// 2. Create transaction items
testTransactionItems[0].transaction_id = transactionData.id;

const { error: itemsError } = await supabase
  .from('transaction_items')
  .insert(testTransactionItems);

if (itemsError) {
  console.error('Failed to create transaction items:', itemsError);
  process.exit(1);
}

console.log('Transaction items created successfully');

// 3. Verify the transaction exists
const { data: verificationData, error: verificationError } = await supabase
  .from('transactions')
  .select('*')
  .eq('id', transactionData.id)
  .single();

if (verificationError) {
  console.error('Failed to verify transaction:', verificationError);
  process.exit(1);
}

console.log('Transaction verified successfully:', verificationData);

console.log('All tests passed! Transaction creation is working correctly.');