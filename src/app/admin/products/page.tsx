'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function ProductManagement() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    try {
      const { data, error } = await supabaseDB.getProducts();
      if (error) throw new Error(error);
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products.');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Management</h1>
        <Button onClick={handleAddProduct} className="bg-primary-600 hover:bg-primary-700 text-white">
          Add Product
        </Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700">
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-b border-gray-200 dark:border-gray-700">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.stock_quantity}</TableCell>
                  <TableCell>
                    {product.barcode ? (
                      <Button onClick={() => handleShowBarcode(product)} variant="outline" size="sm">
                        View Barcode
                      </Button>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                      <Button onClick={() => handleEditProduct(product)} variant="secondary" size="sm">
                        Edit
                      </Button>
                      <Button onClick={() => handleDeleteProduct(product.id)} variant="destructive" size="sm">
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
