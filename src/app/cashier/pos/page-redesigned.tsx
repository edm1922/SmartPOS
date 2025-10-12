'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAuth, supabaseDB } from '@/lib/supabaseClient';
import { ProductCard } from '@/components/redesigned/ProductCard';
import { ShoppingCart } from '@/components/redesigned/ShoppingCart';
import { PaymentModal } from '@/components/redesigned/PaymentModal';
import { Receipt } from '@/components/redesigned/Receipt';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  stock_quantity: number;
  created_at: string;
}

export default function CashierPOSRedesigned() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      }
    }
    
    // ESC to close modals
    if (e.key === 'Escape') {
      if (isPaymentModalOpen) {
        setIsPaymentModalOpen(false);
      } else if (isReceiptModalOpen) {
        setIsReceiptModalOpen(false);
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
  }, [cart, products, isPaymentModalOpen, isReceiptModalOpen]);

  // Handle barcode scanning
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = async () => {
    const { error } = await supabaseAuth.signOut();
    
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

  const completeTransaction = async (paymentMethod: 'cash' | 'card' | 'mobile', amountReceived?: number) => {
    try {
      // In a real app, you would save the transaction to your database
      const transactionData = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toLocaleString(),
        items: cart,
        total: calculateTotal(),
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? amountReceived : calculateTotal(),
        change: paymentMethod === 'cash' ? Math.max(0, (amountReceived || 0) - calculateTotal()) : 0,
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
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-md shadow-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button
                className="ml-4"
                onClick={() => setError(null)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 left-4 z-50 animate-fade-in">
          <div className="bg-green-50 border border-green-200 p-4 rounded-md shadow-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
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
              <Input
                type="text"
                className="pl-10"
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
              <Input
                ref={barcodeInputRef}
                type="text"
                className="pl-10"
                placeholder="Scan barcode... (Ctrl+B to focus)"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-gray-500">Enter↵</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96">
          <ShoppingCart
            cart={cart}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onProcessPayment={handleProcessPayment}
            onClearCart={handleClearCart}
          />
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={calculateTotal()}
        onCompletePayment={completeTransaction}
      />

      {/* Receipt Modal */}
      <Receipt
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
        onPrint={printReceipt}
      />

      {/* Transaction Complete Notification */}
      {transactionComplete && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-50 border border-green-200 p-4 rounded-md shadow-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Transaction completed successfully!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}