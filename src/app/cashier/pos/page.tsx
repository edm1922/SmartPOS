'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Settings,
  LogOut,
  Box,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  CreditCard,
  Wallet,
  Monitor,
  Landmark,
  Check
} from 'lucide-react';
import { PrintableReceipt } from '@/components/ui/PrintableReceipt';

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  category?: string;
  stock_quantity: number;
  image_url?: string;
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'cheque'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // For success notifications
  const [barcodeValue, setBarcodeValue] = useState('');
  const [deliveredTo, setDeliveredTo] = useState('');
  const [tin, setTin] = useState('');
  const [orNumber, setOrNumber] = useState('');
  const [showSignatures, setShowSignatures] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: sessionData, error: sessionError } = await supabaseAuth.getSession();

      // Check for our custom cashier session
      const cashierSession = typeof window !== 'undefined' ? localStorage.getItem('cashier_session') : null;
      const cashierId = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_id') : null;
      const cashierUsername = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_username') : null;

      if ((!sessionData?.session && !cashierSession) || !cashierId || !cashierUsername) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/cashier/login';
        }
        return;
      }

      // Add cashier info to the user object
      const userWithCashierInfo = {
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
    // Fetch products and settings from Supabase
    fetchProducts();
    fetchSettings();

    // Set up real-time listener for product updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Product change detected:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedProduct = payload.new as Product & { deleted_at?: string | null };
            
            // If the product was soft-deleted, remove it from the list
            if (updatedProduct.deleted_at) {
              setProducts((currentProducts) => 
                currentProducts.filter((p) => p.id !== updatedProduct.id)
              );
            } else {
              // Otherwise update it in the list
              setProducts((currentProducts) =>
                currentProducts.map((p) =>
                  p.id === updatedProduct.id ? (updatedProduct as Product) : p
                )
              );
            }
          } else {
            fetchProducts();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings'
        },
        () => {
          console.log('Settings changed, reloading...');
          fetchSettings();
        }
      )
      .subscribe();

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

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabaseDB.getSettings();
      if (error) throw new Error(error);
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabaseAuth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cashier_session');
        sessionStorage.removeItem('cashier_id');
        sessionStorage.removeItem('cashier_username');
        // Clear cookie if used
        document.cookie = 'cashier_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      if (error) {
        console.error('Sign out error:', error);
        setError(error);
      }
      
      router.push('/auth/cashier/login');
    } catch (err: any) {
      console.error('Unexpected sign out error:', err);
      router.push('/auth/cashier/login');
    }
  }, [router]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      setError('Product is out of stock');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          setError('Not enough stock available');
          return prevCart;
        }
        setSuccessMessage(`Added another ${product.name} to cart`);
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        setSuccessMessage(`Added ${product.name} to cart`);
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  const handleBarcodeSubmit = useCallback((barcode: string, source: 'barcode' | 'search' = 'barcode') => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    console.log(`[POS] Processing barcode: "${trimmedBarcode}" from source: ${source}`);

    const product = products.find(p => p.barcode === trimmedBarcode);
    if (product) {
      console.log(`[POS] Product found: ${product.name}`);
      addToCart(product);
      setSearchTerm(product.name);
      setBarcodeValue(trimmedBarcode);
      // Ensure barcode input is focused and selected for next scan
      setTimeout(() => {
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }, 50);
    } else {
      console.log(`[POS] Product not found for barcode: ${trimmedBarcode}`);
      if (source === 'barcode') {
        setError(`Product not found for barcode: ${trimmedBarcode}`);
        setBarcodeValue('');
      }
    }
  }, [products, addToCart]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'p':
          e.preventDefault();
          if (cart.length > 0) setIsPaymentModalOpen(true);
          break;
        case 'c':
          e.preventDefault();
          if (cart.length > 0) setCart([]);
          break;
        case 'b':
          e.preventDefault();
          barcodeInputRef.current?.focus();
          break;
        case 's':
          e.preventDefault();
          handleSignOut();
          break;
        case ',':
          e.preventDefault();
          setIsSettingsModalOpen(true);
          break;
      }
    }

    if (e.key === 'Escape') {
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(false);
      setIsSettingsModalOpen(false);
    }
  }, [cart, products, isPaymentModalOpen, isReceiptModalOpen, isSettingsModalOpen, handleSignOut]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Global barcode scanner wedge - captures scans even when no input is focused
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is already typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Clear buffer just in case
        buffer = '';
        return;
      }

      // Ignore system/modifier keys (except Shift which is used for some barcode chars)
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const now = Date.now();
      // Reset buffer if time between keystrokes is too long (manual typing vs scanner speed)
      // Hardware scanners typically send characters < 50ms apart. 500ms is a safe threshold.
      if (now - lastKeyTime > 500) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer) {
          e.preventDefault();
          handleBarcodeSubmit(buffer, 'barcode');
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        // Optional: Update UI to show characters arriving
        // setBarcodeValue(buffer);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleBarcodeSubmit]);

  const removeFromCart = (productId: string) => {
    const product = cart.find(item => item.id === productId);
    setCart(cart.filter(item => item.id !== productId));
    if (product) {
      setSuccessMessage(`Removed ${product.name} from cart`);
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock_quantity) {
      setError('Not enough stock available');
      return;
    }
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateChange = () => {
    const total = calculateTotal() * (1 + (settings?.tax_rate || 0) / 100);
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
      setError(null);
      setSuccessMessage('Processing transaction...');

      const cashierId = typeof window !== 'undefined' ? sessionStorage.getItem('cashier_id') : null;
      if (!cashierId) throw new Error('Cashier information not found.');

      const { data: cashierData, error: cashierError } = await supabase
        .from('cashiers')
        .select('id, username, is_active')
        .eq('id', cashierId)
        .single();

      if (cashierError || !cashierData?.is_active) throw new Error('Cashier account error.');

      const transactionPayload = {
        cashier_id: cashierId,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        status: 'completed'
      };

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionPayload)
        .select()
        .single();

      if (transactionError) throw transactionError;

      const transactionItems = cart.map(item => ({
        transaction_id: transactionData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('transaction_items').insert(transactionItems);
      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq('id', item.id);
        if (stockError) console.error('Error updating stock:', stockError);
      }

      setReceiptData({
        id: transactionData.id,
        date: new Date().toISOString(),
        items: [...cart],
        total: calculateTotal(),
        paymentMethod,
        amountReceived: parseFloat(amountReceived) || calculateTotal(),
        change: calculateChange()
      });

      setCart([]);
      setAmountReceived('');
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      setTransactionComplete(true);
      setSuccessMessage('Transaction successful!');
      setTimeout(() => setTransactionComplete(false), 5000);
      fetchProducts();
    } catch (error: any) {
      console.error('Transaction error:', error);
      setError(error.message || 'Transaction failed.');
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchTerm));
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative h-20 w-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <ShoppingCart className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Initializing Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen bg-background flex flex-col overflow-hidden print:hidden">
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
          {error && (
            <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-bold">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
          {successMessage && (
            <div className="bg-primary text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-bold">{successMessage}</p>
            </div>
          )}
        </div>

        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight dark:text-white uppercase leading-none">SmartPOS <span className="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-md ml-1">Terminal</span></h1>
              <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Operator: {user?.cashier_username || 'Staff'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="h-8 w-px bg-border mx-2" />
            <Button onClick={() => setIsSettingsModalOpen(true)} variant="ghost" size="sm" className="font-bold text-xs"><Settings className="h-4 w-4" /></Button>
            <Button onClick={handleSignOut} variant="destructive" size="sm" className="font-bold text-xs flex items-center gap-2"><LogOut className="h-4 w-4" /> LOCK</Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <section className="flex-1 flex flex-col bg-background">
            <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search item..." 
                    className="pl-10 h-11 bg-white dark:bg-gray-800 rounded-xl" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeSubmit((e.target as HTMLInputElement).value, 'search');
                      }
                    }}
                  />
                </div>
                <div className="relative group">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    ref={barcodeInputRef} 
                    placeholder="Scan barcode..." 
                    className="pl-10 h-11 bg-white dark:bg-gray-800 rounded-xl"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeSubmit((e.target as HTMLInputElement).value, 'barcode');
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)} className="rounded-full text-[10px] uppercase h-8">All Items</Button>
                {PRODUCT_CATEGORIES.map((category) => (
                  <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category)} className="rounded-full text-[10px] uppercase h-8">{category}</Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group relative" onClick={() => addToCart(product)}>
                    <Card className={`h-full flex flex-col cursor-pointer transition-all border-border overflow-hidden ${product.stock_quantity <= 0 ? 'opacity-60 grayscale' : ''}`}>
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500" />
                        ) : (
                          <Box className="h-12 w-12 text-gray-300 dark:text-gray-700" />
                        )}
                        <div className="absolute top-2 right-2"><Badge variant="secondary">{formatPrice(product.price)}</Badge></div>
                      </div>
                      <CardContent className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold dark:text-white line-clamp-2">{product.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-mono">{product.barcode || 'NO BARCODE'}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[9px] font-black uppercase ${product.stock_quantity > 10 ? 'text-green-500' : 'text-orange-500'}`}>Stock: {product.stock_quantity}</span>
                          <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="h-3 w-3" /></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="w-[400px] bg-card border-l border-border flex flex-col shadow-2xl relative z-10">
            <div className="p-6 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase dark:text-white flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Checkout</h2>
                <Badge variant="outline">{cart.length} Items</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <ShoppingCart className="h-16 w-16 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Cart is Empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold dark:text-white leading-tight">{item.name}</h4>
                        <p className="text-xs text-primary font-bold">{formatPrice(item.price)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded-xl p-1 shadow-sm">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                        <Input
                          type="number"
                          className="w-10 h-8 text-center text-xs font-black bg-transparent border-none p-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updateQuantity(item.id, val);
                            } else if (e.target.value === '') {
                              // If cleared, we can either set to 0 (removes item) or leave as is. 
                              // Setting to 0 is the most intuitive "delete" action via input.
                              updateQuantity(item.id, 0);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock_quantity}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <span className="text-sm font-black pr-2">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-muted/30 border-t border-border shrink-0 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase"><span>Subtotal</span><span>{formatPrice(calculateTotal())}</span></div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase"><span>VAT</span><span>{formatPrice(calculateTotal() * (settings?.tax_rate || 0) / 100)}</span></div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-2xl font-black dark:text-white">
                  <span className="text-sm uppercase">Total</span>
                  <span className="text-primary">{formatPrice(calculateTotal() * (1 + (settings?.tax_rate || 0) / 100))}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-14 rounded-2xl font-bold uppercase text-xs" onClick={() => setCart([])} disabled={cart.length === 0}>Clear</Button>
                <Button className="h-14 rounded-2xl font-black uppercase text-xs shadow-xl" onClick={handleProcessPayment} disabled={cart.length === 0}>Pay Now</Button>
              </div>
            </div>
          </aside>
        </main>

        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Processing Order" size="md">
          <div className="space-y-8 p-2">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
              <h2 className="text-5xl font-black text-primary">{formatPrice(calculateTotal() * (1 + (settings?.tax_rate || 0) / 100))}</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <PaymentTab active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={<Wallet className="h-5 w-5" />} label="Cash" />
              <PaymentTab active={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')} icon={<CreditCard className="h-5 w-5" />} label="Card" />
              <PaymentTab active={paymentMethod === 'mobile'} onClick={() => setPaymentMethod('mobile')} icon={<Monitor className="h-5 w-5" />} label="Mobile" />
              <PaymentTab active={paymentMethod === 'cheque'} onClick={() => setPaymentMethod('cheque')} icon={<Landmark className="h-5 w-5" />} label="Cheque" />
            </div>
            {paymentMethod === 'cash' && (
              <div className="bg-muted/50 p-6 rounded-3xl border border-border">
                <label className="block text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-3 text-center">Amount Tendered</label>
                <div className="relative">
                  <Input type="number" className="h-20 text-center text-4xl font-black bg-card rounded-2xl" placeholder="0.00" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} autoFocus />
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₱</div>
                </div>
                {parseFloat(amountReceived) >= (calculateTotal() * (1 + (settings?.tax_rate || 0) / 100)) && (
                  <div className="mt-6 text-center animate-in zoom-in duration-300">
                    <p className="text-xs font-black text-green-600 uppercase mb-1">Change Due</p>
                    <h3 className="text-4xl font-black text-green-700">{formatPrice(calculateChange())}</h3>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-4">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase" onClick={() => setIsPaymentModalOpen(false)}>Back</Button>
              <Button className="flex-[2] h-14 rounded-2xl font-black uppercase" onClick={completeTransaction}>Finalize</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Finalized" size="md">
          {receiptData && (
            <div className="bg-white p-8 rounded-3xl text-gray-900 shadow-inner">
              <div className="text-center mb-8">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary"><Receipt className="h-6 w-6" /></div>
                <h2 className="text-2xl font-black uppercase">{settings?.store_name || 'SMART POS'}</h2>
                {settings?.show_address_on_receipt && settings?.store_address && (
                  <p className="text-gray-500 text-sm mt-1">{settings.store_address}</p>
                )}
                {settings?.show_phone_on_receipt && settings?.store_phone && (
                  <p className="text-gray-500 text-sm">TEL: {settings.store_phone}</p>
                )}
                {settings?.receipt_header && (
                  <p className="text-gray-500 text-xs mt-2 italic whitespace-pre-wrap">{settings.receipt_header}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 border-y border-dashed border-gray-200 py-6 mb-8 text-xs">
                <div><p className="font-black text-gray-400 uppercase">Order Ref</p><p className="font-mono font-bold">{receiptData.id.substring(0, 8).toUpperCase()}</p></div>
                <div className="text-right"><p className="font-black text-gray-400 uppercase">Method</p><Badge className="text-[8px] font-black uppercase h-4 px-1.5">{receiptData.paymentMethod}</Badge></div>
              </div>

              {/* Editable Fields for Receipt */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Delivered To</label>
                  <Input
                    placeholder="Buyer..."
                    value={deliveredTo}
                    onChange={(e) => setDeliveredTo(e.target.value)}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">TIN</label>
                  <Input
                    placeholder="TIN..."
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">OR No.</label>
                  <Input
                    placeholder="Serial #"
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    className="h-8 text-xs font-bold border-red-200 focus:border-red-500 text-red-600"
                  />
                </div>
              </div>

              {/* Signature Toggle - Modern Minimal */}
              <div className="bg-card p-5 rounded-2xl mb-8 border border-border shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-all ${showSignatures ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Include Signatures</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Cashier & Customer signature lines</p>
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={showSignatures}
                      onChange={() => setShowSignatures(!showSignatures)}
                    />
                    <div className="peer h-7 w-12 rounded-full border bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-5 peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/50 peer-focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:after:bg-gray-400"></div>
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <table className="w-full border-collapse border border-gray-200 text-xs">
                  <thead>
                    <tr className="bg-gray-50 uppercase text-[9px] font-black text-gray-400">
                      <th className="border border-gray-200 px-2 py-1 text-center">Qty</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Description</th>
                      <th className="border border-gray-200 px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="border border-gray-200 px-2 py-1 text-center font-bold">{item.quantity}</td>
                        <td className="border border-gray-200 px-2 py-1">
                          <p className="font-bold text-gray-800 uppercase text-[10px]">{item.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold">@{formatPrice(item.price)}</p>
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-black">{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl mb-8 space-y-2">
                <div className="flex justify-between items-center text-xl font-black text-gray-900">
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatPrice(receiptData.total)}</span>
                    </div>
                    {settings?.show_tax_on_receipt && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>VAT ({settings.tax_rate}%)</span>
                        <span>{formatPrice(receiptData.total * (settings.tax_rate || 0) / 100)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xl font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span className="text-[10px] uppercase">Grand Total</span>
                    <span className="text-2xl">{formatPrice(receiptData.total * (1 + (settings?.tax_rate || 0) / 100))}</span>
                  </div>
                </div>
              </div>
              <div className="text-center text-xs text-gray-500 mb-6 whitespace-pre-wrap">
                {settings?.receipt_footer || (
                  <>
                    <p>Thank you for your purchase!</p>
                    <p>Please come again.</p>
                  </>
                )}
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold uppercase" onClick={() => setIsReceiptModalOpen(false)}>Close</Button>
                <Button className="flex-[2] h-12 rounded-2xl font-black uppercase" onClick={printReceipt}>Print Ticket</Button>
              </div>
            </div>
          )}
        </Modal>

        <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
      <div className="hidden print:block">
        {receiptData && (
          <PrintableReceipt
            transactionId={receiptData.id}
            date={receiptData.date}
            items={receiptData.items}
            subtotal={receiptData.total}
            tax={receiptData.total * (settings?.tax_rate || 0) / 100}
            total={receiptData.total * (1 + (settings?.tax_rate || 0) / 100)}
            paymentMethod={receiptData.paymentMethod}
            amountReceived={receiptData.amountReceived}
            change={receiptData.change}
            storeName={settings?.store_name}
            storeAddress={settings?.store_address}
            storePhone={settings?.store_phone}
            cashierName={user?.cashier_username}
            deliveredTo={deliveredTo}
            tin={tin}
            orNumber={orNumber}
            receiptHeader={settings?.receipt_header}
            receiptFooter={settings?.receipt_footer}
            taxRate={settings?.tax_rate}
            showSignatures={showSignatures}
          />
        )}
      </div>
    </>
  );
}

function PaymentTab({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center h-24 rounded-3xl border-2 transition-all gap-2 ${active ? 'bg-primary border-primary text-primary-foreground shadow-xl' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
      <span className={active ? 'text-primary-foreground' : 'text-muted-foreground'}>{icon}</span>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</span>
    </button>
  );
}