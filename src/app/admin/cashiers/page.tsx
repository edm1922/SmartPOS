'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define the cashier schema for validation
const cashierSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().optional(), // Make password optional since we'll auto-generate it
  email: z.string().email('Invalid email address').or(z.literal('')).optional(), // Optional email field that can be empty
});

type CashierFormData = z.infer<typeof cashierSchema>;

interface Cashier {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
}

export default function CashierManagement() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    try {
      console.log('Fetching cashiers from cashiers table...');
      
      const { data, error, count } = await supabase
        .from('cashiers')
        .select('id, username, email, created_at')
        .is('deleted_at', null)  // Only fetch cashiers that haven't been soft deleted
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cashiers:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        setError(`Failed to load cashiers: ${error.message}`);
        return;
      }

      console.log('Successfully fetched cashiers:', data);
      console.log('Count of cashiers:', count);
      
      setCashiers(data || []);
    } catch (error: any) {
      console.error('Exception while fetching cashiers:', error);
      setError('Failed to load cashiers. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddCashier = () => {
    setIsModalOpen(true);
  };

  const handleDeleteCashier = async (cashierId: string) => {
    try {
      console.log('Permanently deleting cashier with ID:', cashierId);
      
      // Permanently delete the cashier from the database
      const { data, error: dbError } = await supabase
        .from('cashiers')
        .delete()
        .eq('id', cashierId)
        .select();

      if (dbError) {
        console.error('Error deleting cashier:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Cashier permanently deleted successfully:', data);
      
      // Update local state
      setCashiers(cashiers.filter(cashier => cashier.id !== cashierId));
    } catch (error: any) {
      console.error('Error deleting cashier:', error);
      setError(error.message || 'Failed to delete cashier. Please try again.');
    }
  };

  // Function to handle when a cashier is added (called from the modal)
  const handleCashierAdded = () => {
    fetchCashiers(); // Refresh the cashiers list
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
                <a href="/admin/reports" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
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
              <h1 className="text-2xl font-bold text-gray-900">Cashier Management</h1>
              <Button onClick={handleAddCashier}>Add Cashier</Button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashiers.map((cashier) => (
                      <TableRow key={cashier.id}>
                        <TableCell className="font-medium text-gray-900">{cashier.username || cashier.email}</TableCell>
                        <TableCell>{new Date(cashier.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleDeleteCashier(cashier.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cashiers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                          No cashiers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Add Cashier Modal */}
      <AddCashierModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCashierAdded={handleCashierAdded}
      />
    </div>
  );
}

interface AddCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashierAdded: () => void;
}

// Add interface for cashier creation result
interface CreatedCashier {
  id: string;
  username: string;
  password: string;
  email: string | null;
}

const AddCashierModal: React.FC<AddCashierModalProps> = ({ isOpen, onClose, onCashierAdded }) => {
  const form = useForm<CashierFormData>({
    resolver: zodResolver(cashierSchema),
    defaultValues: {
      username: '',
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCashier, setCreatedCashier] = useState<CreatedCashier | null>(null); // Store created cashier info
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null); // Store generated password

  const onSubmit = async (data: CashierFormData) => {
    setLoading(true);
    setError(null);
    setCreatedCashier(null);
    setGeneratedPassword(null);
    
    try {
      console.log('Creating cashier:', data.username);
      
      // Generate a random password if not provided
      const password = data.password || generateRandomPassword();
      setGeneratedPassword(password); // Store the generated password
      
      // Create cashier in the cashiers table
      const { data: cashierData, error: dbError } = await supabase
        .from('cashiers')
        .insert({
          username: data.username,
          password: password, // In a real implementation, this should be hashed
          email: data.email || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error creating cashier:', dbError);
        console.error('Error details:', {
          message: dbError.message,
          code: dbError.code,
          hint: dbError.hint,
          details: dbError.details
        });
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Cashier created successfully:', cashierData);
      
      // Store created cashier info
      setCreatedCashier({
        id: cashierData.id,
        username: cashierData.username,
        password: password,
        email: cashierData.email
      });
      
      // Refresh cashiers list
      onCashierAdded();
    } catch (error: any) {
      console.error('Error creating cashier:', error);
      setError(error.message || 'Failed to create cashier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to download password as a text file
  const downloadPassword = () => {
    if (!createdCashier) return;
    
    const content = `Cashier Account Details
=====================

Username: ${createdCashier.username}
Password: ${createdCashier.password}
${createdCashier.email ? `Email: ${createdCashier.email}` : ''}

Please save this information securely and change the password after first login.

Generated on: ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashier-${createdCashier.username}-credentials.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to print password
  const printPassword = () => {
    if (!createdCashier) return;
    
    const printContent = `
      <html>
        <head>
          <title>Cashier Credentials</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            .detail-item { margin: 10px 0; }
            .password { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cashier Account Details</h1>
            <p>POS System Credentials</p>
          </div>
          <div class="details">
            <div class="detail-item"><strong>Username:</strong> ${createdCashier.username}</div>
            <div class="detail-item"><strong>Password:</strong> <span class="password">${createdCashier.password}</span></div>
            ${createdCashier.email ? `<div class="detail-item"><strong>Email:</strong> ${createdCashier.email}</div>` : ''}
          </div>
          <p><em>Please save this information securely and change the password after first login.</em></p>
          <p><em>Generated on: ${new Date().toLocaleString()}</em></p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Function to close the modal and reset state
  const handleClose = () => {
    onClose();
    // Reset state after a short delay to allow for closing animation
    setTimeout(() => {
      setCreatedCashier(null);
      setGeneratedPassword(null);
      setError(null);
      form.reset();
    }, 300);
  };

  // If we have a created cashier, show the success screen with password
  if (createdCashier) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title="Cashier Created Successfully"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Cashier account created successfully!</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important: Save the password securely</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This is the only time the password will be displayed. Please save it securely.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-md p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Account Credentials</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-gray-900">
                  {createdCashier.username}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 font-mono">
                  {createdCashier.password}
                </div>
              </div>
              
              {createdCashier.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-gray-900">
                    {createdCashier.email}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={downloadPassword} variant="default" className="flex-1">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download as File
            </Button>
            
            <Button onClick={printPassword} variant="outline" className="flex-1">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Credentials
            </Button>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Add Cashier"
      size="md"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          
          <FormField
            name="username"
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  {...field} 
                  id="username"
                  type="text" 
                  placeholder="Enter username" 
                />
              </div>
            )}
          />
          
          <FormField
            name="email"
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input 
                  {...field} 
                  id="email"
                  type="email" 
                  placeholder="Enter email (optional)" 
                />
                <p className="text-sm text-gray-500">Email is optional for password reset and communication</p>
              </div>
            )}
          />
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Cashier'}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

// Function to generate a random password
const generateRandomPassword = (length: number = 12): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};
