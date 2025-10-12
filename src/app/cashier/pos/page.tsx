'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription
} from '@/components/ui/Card';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencySelector } from '@/components/CurrencySelector';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock_quantity: number;
  created_at: string;
}

export default function CashierPOS() {
  const { formatPrice } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); // For mobile cart drawer
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // For success notifications
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData, error: sessionError } = await supabaseAuth.getSession();
      
      // Check for our custom cashier session
      const cashierSession = typeof window !== 'undefined' ? localStorage.getItem('cashier_session') : null;
      const cashierId = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_id') : null;
      const cashierUsername = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_username') : null;
      
      console.log('Session check:', { 
        supabaseSession: !!sessionData?.session, 
        cashierSession, 
        cashierId, 
        cashierUsername 
      });
      
      if ((!sessionData?.session && !cashierSession) || !cashierId || !cashierUsername) {
        console.log('No valid session, redirecting to cashier login');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/cashier/login';
        }
        return;
      }

      // Add cashier info to the user object
      const userWithCashierInfo = {
        // If we have a real Supabase session, use it, otherwise create a mock user object
        ...(sessionData?.session?.user || { id: 'cashier', email: 'cashier@pos-system.local' }),
        cashier_id: cashierId,
        cashier_username: cashierUsername
      };

      setUser(userWithCashierInfo);
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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Focus the barcode input when a key is pressed
    if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Focus barcode input on any key press except Escape
      if (e.key !== 'Escape') {
        barcodeInputRef.current.focus();
      }
    }
    
    // Global keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'p': // Ctrl/Cmd + P for process payment
          e.preventDefault();
          if (cart.length > 0) {
            setIsPaymentModalOpen(true);
          }
          break;
        case 'c': // Ctrl/Cmd + C for clear cart
          e.preventDefault();
          if (cart.length > 0) {
            setCart([]);
          }
          break;
        case 'b': // Ctrl/Cmd + B for focus barcode input
          e.preventDefault();
          barcodeInputRef.current?.focus();
          break;
        case 's': // Ctrl/Cmd + S for sign out
          e.preventDefault();
          handleSignOut();
          break;
        case ',': // Ctrl/Cmd + , for settings
          e.preventDefault();
          setIsSettingsModalOpen(true);
          break;
      }
    }
    
    // ESC to close modals
    if (e.key === 'Escape') {
      if (isPaymentModalOpen) {
        setIsPaymentModalOpen(false);
      } else if (isReceiptModalOpen) {
        setIsReceiptModalOpen(false);
      } else if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
      }
    }
    
    // Enter in barcode input
    if (e.key === 'Enter' && e.target === barcodeInputRef.current) {
      const barcode = (e.target as HTMLInputElement).value;
      const product = products.find(p => p.barcode === barcode);
      
      if (product) {
        addToCart(product);
        (e.target as HTMLInputElement).value = ''; // Clear the input
      }
    }
  }, [cart, products, isPaymentModalOpen, isReceiptModalOpen, isSettingsModalOpen]);

  // Handle barcode scanning
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = async () => {
    const { error } = await supabaseAuth.signOut();
    
    // Clean up our custom cashier session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cashier_session');
      sessionStorage.removeItem('cashier_id');
      sessionStorage.removeItem('cashier_username');
      // Also remove the cookie
      document.cookie = 'cashier_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    
    if (error) {
      setError(error);
      return;
    }
    
    router.push('/');
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
      
      // Show success feedback
      setSuccessMessage(`Added another ${product.name} to cart`);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      
      // Show success feedback
      setSuccessMessage(`Added ${product.name} to cart`);
    }
    
    // Clear success message after 2 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);
  };

  const removeFromCart = (productId: string) => {
    const product = cart.find(item => item.id === productId);
    setCart(cart.filter(item => item.id !== productId));
    
    // Show success feedback
    if (product) {
      setSuccessMessage(`Removed ${product.name} from cart`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    }
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
    
    // Find the current item in cart
    const currentItem = cart.find(item => item.id === productId);
    
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity } 
        : item
    ));
    
    // Show success feedback for significant changes
    if (product && currentItem && Math.abs(quantity - currentItem.quantity) >= 1) {
      setSuccessMessage(`Updated ${product.name} quantity to ${quantity}`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    }
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

  const handleClearCart = () => {
    setCart([]);
    setSuccessMessage('Cart cleared');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);
  };

  const completeTransaction = async () => {
    try {
      // Show loading state
      setError(null);
      setSuccessMessage('Processing transaction...');
      
      // Get the real cashier ID from sessionStorage
      const cashierId = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_id') : null;
      
      if (!cashierId) {
        throw new Error('Cashier information not found. Please log in again.');
      }

      console.log('Creating transaction for cashier ID:', cashierId);
      
      // Validate that the cashier exists and is active
      const { data: cashierData, error: cashierError } = await supabase
        .from('cashiers')
        .select('id, username, is_active')
        .eq('id', cashierId)
        .single();
        
      if (cashierError) {
        console.error('Error validating cashier:', cashierError);
        throw new Error(`Failed to validate cashier: ${cashierError.message || 'Unknown error'}`);
      }
      
      if (!cashierData || !cashierData.is_active) {
        throw new Error('Cashier account is not active. Please contact administrator.');
      }
      
      console.log('Cashier validated:', cashierData);

      // Save transaction to database
      const transactionPayload = {
        cashier_id: cashierId,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        status: 'completed'
      };
      
      console.log('Transaction payload:', transactionPayload);
      
      // Add a small delay to ensure the cashier validation is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Enhanced error handling with detailed logging
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionPayload)
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        console.error('Transaction payload that failed:', transactionPayload);
        console.error('Supabase client config:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
        
        // Provide more specific error information
        const errorMessage = transactionError.message || 'Unknown database error';
        // Add more context to the error message
        if (errorMessage.includes('row-level security')) {
          throw new Error('Access denied: You do not have permission to create transactions. Please contact your administrator. (RLS Policy Violation)');
        } else if (errorMessage.includes('401')) {
          throw new Error('Authentication failed: The system is not properly configured to allow transaction creation. Please contact your administrator. (401 Unauthorized)');
        }
        throw new Error(`Failed to create transaction: ${errorMessage}`);
      }
      
      console.log('Transaction created:', transactionData);

      // Save transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transactionData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      
      console.log('Transaction items to insert:', transactionItems);

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) {
        console.error('Error creating transaction items:', itemsError);
        // Provide more specific error information
        const errorMessage = itemsError.message || 'Unknown database error';
        throw new Error(`Failed to save transaction items: ${errorMessage}`);
      }
      
      console.log('Transaction items saved successfully');

      // Update inventory in Supabase
      let inventoryUpdateErrors = 0;
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const newStock = product.stock_quantity - item.quantity;
          console.log(`Updating stock for product ${product.id}: ${product.stock_quantity} -> ${newStock}`);
          
          const { error } = await supabaseDB.updateProductStock(item.id, newStock);
            
          if (error) {
            console.error('Error updating inventory for product:', item.id, error);
            inventoryUpdateErrors++;
          }
        }
      }
      
      if (inventoryUpdateErrors > 0) {
        console.warn(`Failed to update inventory for ${inventoryUpdateErrors} products`);
        // Don't throw an error here as the transaction was successful
        setSuccessMessage(`Transaction completed with ${inventoryUpdateErrors} inventory update issues. Please check product stock manually.`);
      } else {
        setSuccessMessage('Transaction completed successfully!');
      }
      
      // Prepare receipt data
      const receiptData = {
        id: transactionData.id,
        date: new Date(transactionData.created_at).toLocaleString(),
        items: cart,
        total: calculateTotal(),
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) || 0 : calculateTotal(),
        change: paymentMethod === 'cash' ? calculateChange() : 0,
      };
      
      console.log('Transaction completed:', receiptData);
      
      // Set receipt data
      setReceiptData(receiptData);
      
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
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error completing transaction:', error);
      // Provide more detailed error messages
      const errorMessage = error.message || 'Error completing transaction. Please try again.';
      setError(errorMessage);
      setSuccessMessage(null);
      
      // If it's a 401 error, suggest checking the database configuration
      if (errorMessage.includes('401') || errorMessage.includes('Authentication failed')) {
        setError(`${errorMessage} - Please ensure the database security policies have been applied. See APPLY_DATABASE_FIXES.md for instructions.`);
      }
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
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pulse-once {
          animation: pulse 0.3s ease-in-out;
        }
      `}</style>
      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="bg-red-50 border-red-200">
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 left-4 z-50 animate-fade-in">
          <Card className="bg-green-50 border-green-200">
            <CardContent>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            </CardContent>
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
              <Button 
                onClick={() => setIsSettingsModalOpen(true)} 
                variant="outline" 
                size="sm" 
                className="mr-2"
              >
                Settings (Ctrl+,)
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="mr-2">
                Sign out (Ctrl+S)
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
                placeholder="Scan barcode... (Ctrl+B to focus)"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-gray-500">Enter↵</span>
              </div>
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
                  <CardContent className="p-4">
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
                      <p className="text-lg font-bold text-primary-600">{formatPrice(product.price)}</p>
                    </div>
                    <Button 
                      className={`mt-4 w-full ${successMessage && successMessage.includes(product.name) ? 'animate-pulse-once' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={product.stock_quantity <= 0}
                      variant={product.stock_quantity <= 0 ? 'secondary' : 'default'}
                    >
                      {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">Shopping Cart</CardTitle>
            </CardHeader>
            
            <CardContent className="p-4">
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
                        <p className="text-sm text-gray-500">{formatPrice(item.price)} each</p>
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
                          variant="destructive"
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
            </CardContent>
            
            <CardFooter className="p-4">
              <div className={`flex justify-between text-lg font-bold mb-4 ${successMessage ? 'animate-pulse-once' : ''}`}>
                <span>Total:</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>
              <Button 
                className="w-full"
                disabled={cart.length === 0}
                onClick={handleProcessPayment}
                size="lg"
              >
                Process Payment (Ctrl+P)
              </Button>
            </CardFooter>
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
              <span className="font-medium">{formatPrice(calculateTotal())}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">{formatPrice(0)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">{formatPrice(calculateTotal())}</span>
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
                  Change: {formatPrice(calculateChange())}
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
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatPrice(receiptData.total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tax:</span>
                <span>{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-2">
                <span>Total:</span>
                <span>{formatPrice(receiptData.total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{receiptData.paymentMethod}</span>
              </div>
              {receiptData.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Amount Received:</span>
                    <span>{formatPrice(receiptData.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span>{formatPrice(receiptData.change)}</span>
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

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        title="POS Settings"
        size="md"
      >
        <div className="space-y-6">
          <CurrencySelector />
          
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsSettingsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transaction Complete Notification */}
      {transactionComplete && (
        <div className="fixed bottom-4 right-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Transaction completed successfully!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}