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
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface Transaction {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  cashier?: {
    email: string;
  };
}

interface SalesReport {
  date: string;
  total_sales: number;
  transaction_count: number;
}

export default function Reports() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      fetchTransactions();
      fetchSalesReport();
    };

    checkUser();
  }, [dateRange, router]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
    }

    return startDate.toISOString();
  };

  const fetchTransactions = async () => {
    try {
      const startDate = getDateRangeFilter();
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          cashier_id,
          total_amount,
          payment_method,
          status,
          created_at
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(error.message);
      }

      // Fetch cashier details separately
      const transactionIds = data.map(t => t.id);
      if (transactionIds.length > 0) {
        const { data: cashierData, error: cashierError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', data.map(t => t.cashier_id));

        if (!cashierError && cashierData) {
          // Merge cashier data with transactions
          const transactionsWithCashiers = data.map(transaction => {
            const cashier = cashierData.find(c => c.id === transaction.cashier_id);
            return {
              ...transaction,
              cashier: cashier ? { email: cashier.email } : undefined
            };
          });
          
          setTransactions(transactionsWithCashiers);
        } else {
          setTransactions(data);
        }
      } else {
        setTransactions(data);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
    }
  };

  const fetchSalesReport = async () => {
    try {
      const startDate = getDateRangeFilter();
      
      // Get daily sales data
      const { data, error } = await supabase
        .from('transactions')
        .select('created_at, total_amount')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Group by date
      const groupedData: Record<string, { total_sales: number; transaction_count: number }> = {};
      
      data.forEach(transaction => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0];
        
        if (!groupedData[date]) {
          groupedData[date] = {
            total_sales: 0,
            transaction_count: 0
          };
        }
        
        groupedData[date].total_sales += transaction.total_amount;
        groupedData[date].transaction_count += 1;
      });

      // Convert to array format
      const reportData: SalesReport[] = Object.entries(groupedData).map(([date, values]) => ({
        date,
        total_sales: values.total_sales,
        transaction_count: values.transaction_count
      }));

      setSalesReport(reportData);
    } catch (error: any) {
      console.error('Error fetching sales report:', error);
      setError('Failed to load sales report. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getTotalSales = () => {
    return salesReport.reduce((total, report) => total + report.total_sales, 0);
  };

  const getTotalTransactions = () => {
    return salesReport.reduce((total, report) => total + report.transaction_count, 0);
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Products', href: '/admin/products' },
    { name: 'Cashiers', href: '/admin/cashiers' },
    { name: 'Reports', href: '/admin/reports' },
    { name: 'Settings', href: '/admin/settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu modal */}
      <Modal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Navigation"
        size="fullscreen"
      >
        <div className="flex flex-col space-y-4">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="block px-4 py-3 text-lg font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
        </div>
      </Modal>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">POS Admin</span>
              </div>
              {/* Desktop navigation - hidden on mobile */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      item.href === '/admin/reports'
                        ? 'border-primary-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200'
                    }`}
                  >
                    {item.name}
                  </a>
                ))}
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
            {/* Mobile menu button - visible only on mobile */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <span className="sr-only">Open main menu</span>
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">