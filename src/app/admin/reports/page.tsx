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

  const getAverageTransactionValue = () => {
    const totalSales = getTotalSales();
    const totalTransactions = getTotalTransactions();
    return totalTransactions > 0 ? totalSales / totalTransactions : 0;
  };

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
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="/admin/reports" className="border-primary-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-gray-400">View sales data and transaction history</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-3">
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">${getTotalSales().toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{getTotalTransactions()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Period</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white capitalize">{dateRange}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Date Range Selector */}
            <div className="mb-6">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    dateRange === 'today'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setDateRange('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium border-t border-b ${
                    dateRange === 'week'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setDateRange('week')}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                    dateRange === 'month'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setDateRange('month')}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Sales Chart */}
            <Card className="mb-6 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end space-x-2">
                  {salesReport.map((report, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-primary-600 dark:bg-primary-500 rounded-t"
                        style={{ height: `${(report.total_sales / Math.max(...salesReport.map(r => r.total_sales))) * 100}%` }}
                      ></div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-700">
                      <TableHead className="text-gray-900 dark:text-white">Date</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Cashier</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Payment Method</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-b border-gray-200 dark:border-gray-700">
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {new Date(transaction.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {transaction.cashier?.email || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 capitalize">
                          {transaction.payment_method}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900 dark:text-white">
                          ${transaction.total_amount.toFixed(2)}
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
    </div>
);
}