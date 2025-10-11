'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseDB } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Form, FormField, FormInput } from '@/components/ui/Form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

export default function ProductManagement() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    // In a real app, you would delete the product from your database
    setProducts(products.filter(product => product.id !== productId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900">POS Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/admin/dashboard" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/admin/products" className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
                </a>
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

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </div>

            <Card>
              <Card.Content>
                <Table striped hoverable>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Name</Table.HeaderCell>
                      <Table.HeaderCell>Category</Table.HeaderCell>
                      <Table.HeaderCell align="right">Price</Table.HeaderCell>
                      <Table.HeaderCell align="right">Stock</Table.HeaderCell>
                      <Table.HeaderCell>Barcode</Table.HeaderCell>
                      <Table.HeaderCell align="right">Actions</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {products.map((product) => (
                      <Table.Row key={product.id}>
                        <Table.Cell className="font-medium text-gray-900">{product.name}</Table.Cell>
                        <Table.Cell>{product.category || '-'}</Table.Cell>
                        <Table.Cell align="right">${product.price.toFixed(2)}</Table.Cell>
                        <Table.Cell align="right">{product.stock_quantity}</Table.Cell>
                        <Table.Cell>{product.barcode || '-'}</Table.Cell>
                        <Table.Cell align="right">
                          <div className="flex space-x-2 justify-end">
                            <Button 
                              onClick={() => handleEditProduct(product)}
                              variant="secondary"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button 
                              onClick={() => handleDeleteProduct(product.id)}
                              variant="danger"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Card.Content>
            </Card>
          </div>
        </div>
      </main>

      {/* Product Modal */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={editingProduct}
      />
    </div>
  );
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product }) => {
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

  const onSubmit = async (data: ProductFormData) => {
    // In a real app, you would save the product to your database
    console.log('Saving product:', data);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={product ? 'Edit Product' : 'Add Product'}
      size="lg"
    >
      <Form form={form} onSubmit={onSubmit} spacing="loose">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField name="name" label="Product Name" description="Enter the product name">
            {({ field }) => (
              <FormInput 
                {...field} 
                placeholder="Enter product name" 
                icon={
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                }
              />
            )}
          </FormField>
          
          <FormField name="category" label="Category" description="Select or enter a category">
            {({ field }) => (
              <FormInput 
                {...field} 
                placeholder="Enter category" 
                icon={
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                }
              />
            )}
          </FormField>
          
          <FormField name="price" label="Price" description="Enter the product price">
            {({ field }) => (
              <FormInput 
                {...field} 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                icon={
                  <span className="text-gray-400">$</span>
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          </FormField>
          
          <FormField name="stock_quantity" label="Stock Quantity" description="Enter the available quantity">
            {({ field }) => (
              <FormInput 
                {...field} 
                type="number" 
                placeholder="0" 
                icon={
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseInt(e.target.value) || 0)}
              />
            )}
          </FormField>
          
          <FormField name="barcode" label="Barcode" className="sm:col-span-2" description="Enter the product barcode (optional)">
            {({ field }) => (
              <FormInput 
                {...field} 
                placeholder="Enter barcode" 
                icon={
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                }
              />
            )}
          </FormField>
          
          <FormField name="description" label="Description" className="sm:col-span-2" description="Enter a detailed product description">
            {({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors duration-200"
                placeholder="Enter product description"
              />
            )}
          </FormField>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {product ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};