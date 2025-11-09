'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseDB } from '@/lib/supabaseClient';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BarcodeGenerator, downloadBarcodeAsImage, printBarcode } from '@/components/BarcodeGenerator';
import { lookupProductByBarcode, isValidBarcode } from '@/lib/barcodeLookup';

// Define the product schema for validation
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  category: z.string().optional(),
  stock_quantity: z.number().min(0, 'Stock quantity must be a positive number'),
  barcode: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  stock_quantity: number;
  barcode?: string;
  created_at: string;
}

// Function to generate a random 12-digit barcode
const generateBarcode = () => {
  // Generate a 12-digit random number
  const barcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  return barcode;
};

export default function ProductManagement() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/admin/login');
        return;
      }

      setUser(session.user);
      setLoading(false);
      fetchProducts();
    };

    checkUser();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabaseDB.getProducts();
      
      if (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again.');
        return;
      }
      
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log('Attempting to delete product with ID:', productId);
      
      // Find the product name before deleting
      const { data: productData, error: findError } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      
      if (findError) {
        console.error('Error finding product:', findError);
      }
      
      const { error } = await supabaseDB.deleteProduct(productId);
      
      if (error) {
        console.error('Error deleting product:', error);
        setError('Failed to delete product. Please try again. Error: ' + error);
        return;
      }
      
      // Log activity
      if (user) {
        const productName = productData?.name || 'Unknown product';
        await supabaseDB.logActivity(
          user.id, 
          'Product Deleted', 
          `Deleted product "${productName}" (ID: ${productId})`
        );
      }
      
      console.log('Product deleted successfully');
      
      // Remove the product from the local state
      setProducts(products.filter(product => product.id !== productId));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again. Exception: ' + error.message);
    }
  };

  const handleShowBarcode = (product: Product) => {
    setSelectedProduct(product);
    setIsBarcodeModalOpen(true);
  };

  const handleDownloadBarcode = () => {
    if (barcodeRef.current && selectedProduct) {
      downloadBarcodeAsImage(barcodeRef.current, selectedProduct.name);
    }
  };

  const handlePrintBarcode = () => {
    if (barcodeRef.current && selectedProduct) {
      printBarcode(barcodeRef.current, selectedProduct.name);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">POS Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/admin/dashboard" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/admin/products" className="border-primary-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="/admin/reports" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
                </a>
                <a href="/admin/settings" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Settings
                </a>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="sm"
                className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Management</h1>
              <Button 
                onClick={handleAddProduct}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Product
              </Button>
            </div>

            <Card className="bg-white dark:bg-gray-800">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                      <TableHead className="text-gray-900 dark:text-white">Name</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Category</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Price</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Stock</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Barcode</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="border-b border-gray-200 dark:border-gray-700">
                        <TableCell className="font-medium text-gray-900 dark:text-white">{product.name}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">{product.category || '-'}</TableCell>
                        <TableCell className="text-right text-gray-900 dark:text-white">${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-gray-900 dark:text-white">{product.stock_quantity}</TableCell>
                        <TableCell>
                          {product.barcode ? (
                            <Button 
                              onClick={() => handleShowBarcode(product)}
                              variant="outline"
                              size="sm"
                              className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              View Barcode
                            </Button>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex space-x-2 justify-end">
                            <Button 
                              onClick={() => handleEditProduct(product)}
                              variant="secondary"
                              size="sm"
                              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                            >
                              Edit
                            </Button>
                            <Button 
                              onClick={() => handleDeleteProduct(product.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Product Modal */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={editingProduct}
        onSave={fetchProducts}
        setError={setError}
        user={user}
      />

      {/* Barcode Modal */}
      <Modal 
        isOpen={isBarcodeModalOpen} 
        onClose={() => setIsBarcodeModalOpen(false)} 
        title={selectedProduct ? `Barcode for ${selectedProduct.name}` : 'Product Barcode'}
        size="md"
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="mb-4 text-lg font-medium">{selectedProduct.name}</div>
              <BarcodeGenerator 
                ref={barcodeRef}
                value={selectedProduct.barcode || ''} 
                width={3}
                height={120}
                fontSize={16}
              />
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button onClick={handleDownloadBarcode}>
                Download Barcode
              </Button>
              <Button variant="secondary" onClick={handlePrintBarcode}>
                Print Barcode
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 text-center">
              <p>Scan this barcode with your barcode scanner</p>
              <p className="mt-1">Barcode: {selectedProduct.barcode}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: () => void;
  setError: (error: string | null) => void;
  user?: any;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSave, setError, user }) => {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      category: product?.category || '',
      stock_quantity: product?.stock_quantity || 0,
      barcode: product?.barcode || '',
    },
  });

  const { reset } = form;
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: product.category || '',
        stock_quantity: product.stock_quantity,
        barcode: product.barcode || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        price: 0,
        category: '',
        stock_quantity: 0,
        barcode: '',
      });
    }
  }, [product, reset]);

  // Handle barcode scanning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      
      // Enter key in barcode input
      if (e.key === 'Enter' && e.target === barcodeInputRef.current) {
        const barcode = (e.target as HTMLInputElement).value;
        if (barcode) {
          handleBarcodeLookup(barcode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeLookup = async (barcode: string) => {
    if (!isValidBarcode(barcode)) {
      setLookupError('Invalid barcode format');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const productInfo = await lookupProductByBarcode(barcode);
      
      if (productInfo) {
        // Update form fields with the fetched product information
        form.setValue('name', productInfo.name);
        form.setValue('description', productInfo.description || '');
        form.setValue('category', productInfo.category || '');
        form.setValue('price', productInfo.price || 0);
        form.setValue('barcode', barcode);
        
        // Show success message
        setLookupError(`Product found: ${productInfo.name}`);
      } else {
        // Product not found, but we can still use the barcode
        form.setValue('barcode', barcode);
        setLookupError('Product not found in database. You can manually enter product details.');
      }
    } catch (error) {
      console.error('Error looking up barcode:', error);
      setLookupError('Error looking up barcode. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (product) {
        // Update existing product
        const { error } = await supabaseDB.updateProduct(product.id, data);
        
        if (error) {
          console.error('Error updating product:', error);
          setError('Failed to update product. Please try again.');
          return;
        }
        
        // Log activity
        if (user) {
          await supabaseDB.logActivity(
            user.id, 
            'Product Updated', 
            `Updated product "${data.name}" (ID: ${product.id})`
          );
        }
      } else {
        // Add new product
        const { error } = await supabaseDB.addProduct(data);
        
        if (error) {
          console.error('Error adding product:', error);
          setError('Failed to add product. Please try again.');
          return;
        }
        
        // Log activity
        if (user) {
          await supabaseDB.logActivity(
            user.id, 
            'Product Added', 
            `Added new product "${data.name}"`
          );
        }
      }
      
      // Refresh the product list
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    }
  };

  // Function to generate and set a new barcode
  const handleGenerateBarcode = () => {
    const newBarcode = generateBarcode();
    form.setValue('barcode', newBarcode);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={product ? 'Edit Product' : 'Add Product'}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="barcodeScanner">Scan Barcode</Label>
                <div className="flex space-x-2">
                  <Input 
                    ref={barcodeInputRef}
                    id="barcodeScanner"
                    placeholder="Scan barcode or enter manually" 
                    className={lookupError ? (lookupError.includes('found') && !lookupError.includes('not found') ? 'border-green-500' : 'border-red-500') : ''}
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      const barcode = barcodeInputRef.current?.value;
                      if (barcode) {
                        handleBarcodeLookup(barcode);
                      }
                    }}
                    variant="secondary"
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? 'Looking up...' : 'Lookup'}
                  </Button>
                </div>
                {lookupError && (
                  <p className={`text-sm ${lookupError.includes('found') && !lookupError.includes('not found') ? 'text-green-600' : 'text-red-600'}`}>
                    {lookupError}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Scan a product barcode to auto-fill product information</p>
              </div>
            </div>
            
            <FormField
              name="name"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input 
                    {...field} 
                    id="name"
                    placeholder="Enter product name" 
                  />
                  <p className="text-sm text-muted-foreground">Enter the product name</p>
                </div>
              )}
            />
            
            <FormField
              name="category"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input 
                    {...field} 
                    id="category"
                    placeholder="Enter category" 
                  />
                  <p className="text-sm text-muted-foreground">Select or enter a category</p>
                </div>
              )}
            />
            
            <FormField
              name="price"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input 
                    {...field} 
                    id="price"
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">Enter the product price</p>
                </div>
              )}
            />
            
            <FormField
              name="stock_quantity"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input 
                    {...field} 
                    id="stock_quantity"
                    type="number" 
                    placeholder="0" 
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">Enter the available quantity</p>
                </div>
              )}
            />
            
            <div className="sm:col-span-2">
              <FormField
                name="barcode"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <div className="flex space-x-2">
                      <Input 
                        {...field} 
                        id="barcode"
                        placeholder="Enter barcode or generate one" 
                      />
                      <Button 
                        type="button" 
                        onClick={handleGenerateBarcode}
                        variant="secondary"
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Enter the product barcode or generate a new one</p>
                  </div>
                )}
              />
            </div>
            
            <div className="sm:col-span-2">
              <FormField
                name="description"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      {...field}
                      id="description"
                      rows={4}
                      placeholder="Enter product description"
                    />
                    <p className="text-sm text-muted-foreground">Enter a detailed product description</p>
                  </div>
                )}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {product ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};