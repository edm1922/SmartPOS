'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Form, FormField, FormInput } from '@/components/ui/Form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define the cashier schema for validation
const cashierSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type CashierFormData = z.infer<typeof cashierSchema>;

interface Cashier {
  id: string;
  email: string;
  created_at: string;
}

export default function CashierManagement() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      fetchCashiers();
    };

    checkUser();
  }, [router]);

  const fetchCashiers = async () => {
    // In a real app, you would fetch cashiers from your database
    // For now, we'll use mock data
    const mockCashiers: Cashier[] = [
      {
        id: '1',
        email: 'cashier1@example.com',
        created_at: '2023-01-15T10:30:00Z',
      },
      {
        id: '2',
        email: 'cashier2@example.com',
        created_at: '2023-01-20T14:45:00Z',
      },
      {
        id: '3',
        email: 'cashier3@example.com',
        created_at: '2023-02-01T09:15:00Z',
      },
    ];
    
    setCashiers(mockCashiers);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddCashier = () => {
    setIsModalOpen(true);
  };

  const handleDeleteCashier = async (cashierId: string) => {
    // In a real app, you would delete the cashier from your database
    setCashiers(cashiers.filter(cashier => cashier.id !== cashierId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cashier management...</p>
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
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
                </a>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <button
                onClick={handleSignOut}
                className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Cashier Management</h1>
              <Button onClick={handleAddCashier}>Add Cashier</Button>
            </div>

            <Card>
              <Card.Content>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Email</Table.HeaderCell>
                      <Table.HeaderCell>Created At</Table.HeaderCell>
                      <Table.HeaderCell>Actions</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {cashiers.map((cashier) => (
                      <Table.Row key={cashier.id}>
                        <Table.Cell className="font-medium text-gray-900">{cashier.email}</Table.Cell>
                        <Table.Cell>{new Date(cashier.created_at).toLocaleDateString()}</Table.Cell>
                        <Table.Cell>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteCashier(cashier.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
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

      {/* Add Cashier Modal */}
      <AddCashierModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

interface AddCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddCashierModal: React.FC<AddCashierModalProps> = ({ isOpen, onClose }) => {
  const form = useForm<CashierFormData>({
    resolver: zodResolver(cashierSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: CashierFormData) => {
    // In a real app, you would create the cashier in your database
    console.log('Creating cashier:', data);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Add Cashier"
      size="md"
    >
      <Form form={form} onSubmit={onSubmit}>
        <FormField name="email" label="Email">
          {({ field }) => <FormInput {...field} type="email" placeholder="Enter email" />}
        </FormField>
        
        <FormField name="password" label="Password">
          {({ field }) => <FormInput {...field} type="password" placeholder="Enter password" />}
        </FormField>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add Cashier
          </Button>
        </div>
      </Form>
    </Modal>
  );
};