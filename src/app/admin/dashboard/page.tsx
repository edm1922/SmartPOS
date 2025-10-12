'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseDB } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Transaction {
  id: string;
  total_amount: number;
  created_at: string;
  users?: {
    email: string;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  users?: {
    email: string;
  };
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productCount: 0,
    cashierCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      console.log('Checking user session for admin dashboard');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session data:', session);
      
      if (!session) {
        console.log('No session found, redirecting to admin login');
        router.push('/auth/admin/login');
        return;
      }

      setUser(session.user);
      setLoading(false);
      console.log('User authenticated, loading dashboard');
      
      // Fetch dashboard data
      fetchDashboardData();
    };

    checkUser();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
      }
      
      // Fetch users (cashiers)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'cashier');
      
      if (usersError) {
        console.error('Error fetching cashiers:', usersError);
      }
      
      // Fetch recent transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*, users(email)')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      }
      
      // Fetch recent activity logs
      const { data: activityLogs, error: activityLogsError } = await supabase
        .from('activity_logs')
        .select('*, users(email)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activityLogsError) {
        console.error('Error fetching activity logs:', activityLogsError);
      }
      
      // Calculate stats
      const totalRevenue = transactions?.reduce((sum, transaction) => sum + transaction.total_amount, 0) || 0;
      const productCount = products?.length || 0;
      const cashierCount = users?.length || 0;
      
      setStats({
        totalRevenue,
        productCount,
        cashierCount
      });
      
      // Format recent activity from both transactions and activity logs
      let activity: any[] = [];
      
      // Add transaction activities
      const transactionActivities = transactions?.map(transaction => ({
        id: transaction.id,
        action: 'Sale completed',
        description: `Transaction of $${transaction.total_amount.toFixed(2)} by ${transaction.users?.email || 'Unknown user'}`,
        timestamp: transaction.created_at,
        type: 'transaction'
      })) || [];
      
      // Add activity log entries
      const logActivities = activityLogs?.map(log => ({
        id: log.id,
        action: log.action,
        description: `${log.description || ''} by ${log.users?.email || 'Unknown user'}`,
        timestamp: log.created_at,
        type: 'activity'
      })) || [];
      
      // Combine and sort by timestamp
      activity = [...transactionActivities, ...logActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleSignOut = async () => {
    console.log('Signing out user');
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
                <a href="/admin/dashboard" className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
            
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Stats cards */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Products</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-bold text-gray-900">{stats.productCount}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                      <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Cashiers</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-bold text-gray-900">{stats.cashierCount}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent activity */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </CardHeader>
                <CardContent className="p-0">
                  {recentActivity.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {recentActivity.map((activity) => (
                        <li key={activity.id}>
                          <div className="block hover:bg-gray-50 transition-colors duration-150">
                            <div className="flex items-center px-6 py-4">
                              <div className="min-w-0 flex-1 flex items-center">
                                <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-primary-600 truncate">{activity.action}</p>
                                    <p className="mt-1 text-sm text-gray-500">
                                      <span className="truncate">{activity.description}</span>
                                    </p>
                                  </div>
                                  <div className="hidden md:block">
                                    <div>
                                      <p className="text-sm text-gray-900">
                                        {new Date(activity.timestamp).toLocaleString()}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {activity.type === 'transaction' ? 'Transaction' : 'Activity Log'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-6 py-4 text-center text-gray-500">
                      No recent activity
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}