'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

interface Transaction {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
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

  const fetchTransactions = async () => {
    try {
      // In a real app, you would fetch transactions from your database
      // For now, we'll use mock data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          cashier_id: 'cashier1',
          total_amount: 125.99,
          payment_method: 'cash',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          cashier_id: 'cashier2',
          total_amount: 89.50,
          payment_method: 'card',
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        },
        {
          id: '3',
          cashier_id: 'cashier1',
          total_amount: 210.75,
          payment_method: 'mobile',
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
      ];
      
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchSalesReport = async () => {
    try {
      // In a real app, you would generate this from your database
      // For now, we'll use mock data
      const mockSalesReport: SalesReport[] = [
        { date: '2023-05-01', total_sales: 1250.75, transaction_count: 24 },
        { date: '2023-05-02', total_sales: 980.50, transaction_count: 18 },
        { date: '2023-05-03', total_sales: 1120.25, transaction_count: 21 },
        { date: '2023-05-04', total_sales: 1340.00, transaction_count: 27 },
        { date: '2023-05-05', total_sales: 1560.80, transaction_count: 32 },
        { date: '2023-05-06', total_sales: 1780.60, transaction_count: 35 },
        { date: '2023-05-07', total_sales: 1620.90, transaction_count: 29 },
      ];
      
      setSalesReport(mockSalesReport);
    } catch (error) {
      console.error('Error fetching sales report:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="/admin/reports" className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
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
              <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
              <div className="flex space-x-2">
                <Button 
                  variant={dateRange === 'today' ? 'primary' : 'secondary'}
                  onClick={() => setDateRange('today')}
                >
                  Today
                </Button>
                <Button 
                  variant={dateRange === 'week' ? 'primary' : 'secondary'}
                  onClick={() => setDateRange('week')}
                >
                  This Week
                </Button>
                <Button 
                  variant={dateRange === 'month' ? 'primary' : 'secondary'}
                  onClick={() => setDateRange('month')}
                >
                  This Month
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <Card.Content>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">${getTotalSales().toFixed(2)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Transactions</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{getTotalTransactions()}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg. Transaction</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">${getAverageTransactionValue().toFixed(2)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Period</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 capitalize">{dateRange}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>

            {/* Sales Report Chart */}
            <div className="mb-8">
              <Card>
                <Card.Header>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Sales Trend</h3>
                </Card.Header>
                <Card.Content>
                  <div className="h-64 flex items-end space-x-2">
                    {salesReport.map((report, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-primary-600 rounded-t hover:bg-primary-700 transition-colors"
                          style={{ height: `${(report.total_sales / Math.max(...salesReport.map(r => r.total_sales))) * 200}px` }}
                        ></div>
                        <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                          {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <Card.Header>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
              </Card.Header>
              <Card.Content>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Transaction ID</Table.HeaderCell>
                      <Table.HeaderCell>Cashier</Table.HeaderCell>
                      <Table.HeaderCell>Date</Table.HeaderCell>
                      <Table.HeaderCell>Payment Method</Table.HeaderCell>
                      <Table.HeaderCell className="text-right">Amount</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {transactions.map((transaction) => (
                      <Table.Row key={transaction.id}>
                        <Table.Cell className="font-medium text-gray-900">#{transaction.id.slice(0, 8)}</Table.Cell>
                        <Table.Cell>{transaction.cashier_id}</Table.Cell>
                        <Table.Cell>{new Date(transaction.created_at).toLocaleDateString()}</Table.Cell>
                        <Table.Cell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {transaction.payment_method}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium">${transaction.total_amount.toFixed(2)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Card.Content>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}