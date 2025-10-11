'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock_quantity: number;
  created_at: string;
}

export default function CashierPOS() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData, error: sessionError } = await supabaseAuth.getSession();
      
      if (sessionError || !sessionData?.session) {
        router.push('/auth/cashier/login');
        return;
      }

      setUser(sessionData.session.user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    // Fetch products from Supabase
    fetchProducts();
    
    // Set up real-time listener for product updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          setProducts((prev) => [...prev, payload.new as Product]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          setProducts((prev) =>
            prev.map((product) =>
              product.id === payload.new.id ? (payload.new as Product) : product
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          setProducts((prev) => prev.filter((product) => product.id !== payload.old.id));
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabaseDB.getProducts();

      if (error) {
        throw new Error(error);
      }
      
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    }
  };

  // Handle barcode scanning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus the barcode input when a key is pressed
      if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabaseAuth.signOut();
    
    if (error) {
      setError(error);
      return;
    }
    
    router.push('/');
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = e.currentTarget.value;
      const product = products.find(p => p.barcode === barcode);
      
      if (product) {
        addToCart(product);
        e.currentTarget.value = ''; // Clear the input
      }
    }
  };

  const addToCart = (product: Product) => {
    // Check if product is in stock
    if (product.stock_quantity <= 0) {
      setError('Product is out of stock');
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      // Check if adding another would exceed stock
      if (existingItem.quantity >= product.stock_quantity) {
        setError('Not enough stock available');
        return;
      }
      
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    // Find the product to check stock
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock_quantity) {
      setError('Not enough stock available');
      return;
    }
    
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity } 
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  };

  const handleProcessPayment = () => {
    if (cart.length > 0) {
      setIsPaymentModalOpen(true);
    }
  };

  const completeTransaction = async () => {
    try {
      // In a real app, you would save the transaction to your database
      const transactionData = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toLocaleString(),
        items: cart,
        total: calculateTotal(),
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) || 0 : calculateTotal(),
        change: paymentMethod === 'cash' ? calculateChange() : 0,
      };
      
      console.log('Processing payment:', transactionData);
      
      // Update inventory in Supabase
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const newStock = product.stock_quantity - item.quantity;
          const { error } = await supabaseDB.updateProductStock(item.id, newStock);
            
          if (error) {
            console.error('Error updating inventory:', error);
            setError('Error updating inventory. Please try again.');
          }
        }
      }
      
      // Set receipt data
      setReceiptData(transactionData);
      
      // Reset cart and close modal
      setCart([]);
      setIsPaymentModalOpen(false);
      setTransactionComplete(true);
      setAmountReceived('');
      
      // Show receipt modal
      setIsReceiptModalOpen(true);
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setTransactionComplete(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error completing transaction:', error);
      setError('Error completing transaction. Please try again.');
    }
  };

  const printReceipt = () => {
    // In a real app, you would implement actual receipt printing
    // For now, we'll just show an alert
    alert('Receipt would be printed in a real application');
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading POS terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="bg-red-50 border-red-200">
            <Card.Content>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                <button
                  className="ml-4 text-red-500 hover:text-red-700"
                  onClick={() => setError(null)}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900">POS Terminal</span>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="relative rounded-md shadow-sm mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search products by name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Barcode Scanner Input */}
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="Scan barcode..."
                onKeyDown={handleBarcodeScan}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <Card className="hover:shadow-lg transition-all duration-200">
                  <Card.Content className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">Barcode: {product.barcode || 'N/A'}</p>
                        <p className="mt-1 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.stock_quantity > 10 
                              ? 'bg-green-100 text-green-800' 
                              : product.stock_quantity > 0 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            Stock: {product.stock_quantity}
                          </span>
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary-600">${product.price.toFixed(2)}</p>
                    </div>
                    <Button 
                      className="mt-4 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={product.stock_quantity <= 0}
                      variant={product.stock_quantity <= 0 ? 'secondary' : 'primary'}
                    >
                      {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </Card.Content>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96">
          <Card>
            <Card.Header>
              <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
            </Card.Header>
            
            <Card.Content className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                  <p className="mt-1 text-sm text-gray-500">Add products to the cart</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                        <p className="text-sm text-gray-500">Stock: {item.stock_quantity}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          variant="secondary"
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          variant="secondary"
                          size="sm"
                          className="w-8 h-8 p-0"
                          disabled={item.quantity >= item.stock_quantity}
                        >
                          +
                        </Button>
                        <Button 
                          onClick={() => removeFromCart(item.id)}
                          variant="danger"
                          size="sm"
                          className="ml-2 w-8 h-8 p-0"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
            
            <Card.Footer className="p-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
              <Button 
                className="w-full"
                disabled={cart.length === 0}
                onClick={handleProcessPayment}
                size="lg"
              >
                Process Payment
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title="Process Payment"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`py-2 px-4 border rounded-md text-sm font-medium ${
                  paymentMethod === 'cash'
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </button>
              <button
                type="button"
                className={`py-2 px-4 border rounded-md text-sm font-medium ${
                  paymentMethod === 'card'
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </button>
              <button
                type="button"
                className={`py-2 px-4 border rounded-md text-sm font-medium ${
                  paymentMethod === 'mobile'
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('mobile')}
              >
                Mobile
              </button>
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <label htmlFor="amountReceived" className="block text-sm font-medium text-gray-700 mb-2">
                Amount Received
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="amountReceived"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  step="0.01"
                />
              </div>
              {amountReceived && (
                <div className="mt-2 text-sm text-gray-500">
                  Change: ${calculateChange().toFixed(2)}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={completeTransaction}>
              Complete Transaction
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal 
        isOpen={isReceiptModalOpen} 
        onClose={() => setIsReceiptModalOpen(false)} 
        title="Receipt"
        size="md"
      >
        {receiptData && (
          <div className="bg-white p-6 rounded-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">ACME STORE</h2>
              <p className="text-gray-600">123 Main Street, City, State 12345</p>
              <p className="text-gray-600">Phone: (555) 123-4567</p>
            </div>
            
            <div className="border-t border-b border-gray-200 py-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Transaction ID:</span>
                <span>{receiptData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{receiptData.date}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium mb-2">Items:</h3>
              <div className="space-y-2">
                {receiptData.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600"> x{item.quantity}</span>
                    </div>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span>${receiptData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tax:</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2">
                <span>Total:</span>
                <span>${receiptData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{receiptData.paymentMethod}</span>
              </div>
              {receiptData.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Amount Received:</span>
                    <span>${receiptData.amountReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span>${receiptData.change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-600 mb-6">
              <p>Thank you for your purchase!</p>
              <p>Please come again.</p>
            </div>
            
            <div className="flex justify-center space-x-3">
              <Button variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </Button>
              <Button onClick={printReceipt}>
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Complete Notification */}
      {transactionComplete && (
        <div className="fixed bottom-4 right-4">
          <Card className="bg-green-50 border-green-200">
            <Card.Content>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Transaction completed successfully!</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}