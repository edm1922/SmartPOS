'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, supabaseDB } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { BarcodeGenerator, downloadBarcodeAsImage, printBarcode } from '@/components/BarcodeGenerator';
import { ProductModal } from '@/components/admin/ProductModal';
import { useCurrency } from '@/context/CurrencyContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Barcode,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Box
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  stock_quantity: number;
  barcode?: string;
  image_url?: string;
  created_at: string;
}

export default function ProductManagement() {
  const { formatPrice } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      fetchProducts();
    };
    fetchUserAndProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseDB.getProducts();
      if (error) throw new Error(error);
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
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
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { data: productData } = await supabase.from('products').select('name').eq('id', productId).single();
      const { error } = await supabaseDB.deleteProduct(productId);
      if (error) throw new Error(error);

      if (user) {
        await supabaseDB.logActivity(user.id, 'Product Deleted', `Deleted product "${productData?.name || 'Unknown'}"`);
      }
      setProducts(products.filter(p => p.id !== productId));
    } catch (error: any) {
      setError('Failed to delete product.');
    }
  };

  const handleShowBarcode = (product: Product) => {
    setSelectedProduct(product);
    setIsBarcodeModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const getStockBadge = (quantity: number) => {
    if (quantity <= 0) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Out of Stock</Badge>;
    if (quantity <= 10) return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1"><AlertTriangle className="h-3 w-3" /> Low Stock</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> In Stock</Badge>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control your stock, pricing, and product barcodes.
          </p>
        </div>
        <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 px-6">
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search products by name or barcode..."
            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-primary h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-[200px]">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PRODUCT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Badge variant="destructive" className="w-full py-2 flex items-center h-auto justify-center gap-2 rounded-xl">
          <AlertTriangle className="h-4 w-4" /> {error}
        </Badge>
      )}

      {/* Products Table */}
      <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b">
                <TableRow>
                  <TableHead className="w-[300px]">Product Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock Status</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-12 w-full rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28 ml-auto rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-24 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 ml-auto rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Box className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-none">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tight">ID: {product.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-1 w-fit">
                          <Layers className="h-3 w-3" />
                          {product.category || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-black text-gray-900 dark:text-white">{formatPrice(product.price)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{product.stock_quantity} units</span>
                          {getStockBadge(product.stock_quantity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.barcode ? (
                          <Button
                            onClick={() => handleShowBarcode(product)}
                            variant="secondary"
                            size="sm"
                            className="h-8 text-[10px] font-bold gap-1.5 uppercase hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                            <Barcode className="h-3 w-3" /> View Code
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            onClick={() => handleEditProduct(product)}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:text-primary hover:border-primary/50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProduct(product.id)}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-red-500 hover:text-red-700 hover:border-red-500/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">No products found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={fetchProducts}
        setError={setError}
        user={user}
      />

      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title={selectedProduct ? `Barcode: ${selectedProduct.name}` : 'Barcode'}
        size="md"
      >
        {selectedProduct && (
          <div className="flex flex-col items-center space-y-6">
            <BarcodeGenerator
              ref={barcodeRef}
              value={selectedProduct.barcode || ''}
              width={3}
              height={120}
            />
            <div className="flex space-x-4">
              <Button onClick={() => barcodeRef.current && downloadBarcodeAsImage(barcodeRef.current, selectedProduct.name)}>
                Download
              </Button>
              <Button variant="secondary" onClick={() => barcodeRef.current && printBarcode(barcodeRef.current, selectedProduct.name)}>
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
