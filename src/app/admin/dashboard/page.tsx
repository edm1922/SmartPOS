'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productCount: 0,
    cashierCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: products } = await supabase.from('products').select('id');
      const { data: users } = await supabase.from('users').select('id').eq('role', 'cashier');
      const { data: transactions } = await supabase.from('transactions').select('*, users(email)').order('created_at', { ascending: false }).limit(5);
      const { data: activityLogs } = await supabase.from('activity_logs').select('*, users(email)').order('created_at', { ascending: false }).limit(5);

      const totalRevenue = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      setStats({
        totalRevenue,
        productCount: products?.length || 0,
        cashierCount: users?.length || 0
      });

      const activity = [
        ...(transactions || []).map(t => ({
          id: t.id,
          action: 'Sale completed',
          description: `Transaction of $${t.total_amount.toFixed(2)} by ${t.users?.email || 'Unknown'}`,
          timestamp: t.created_at,
          type: 'transaction'
        })),
        ...(activityLogs || []).map(l => ({
          id: l.id,
          action: l.action,
          description: `${l.description || ''} by ${l.users?.email || 'Unknown'}`,
          timestamp: l.created_at,
          type: 'activity'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-lg p-3">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 truncate">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-lg p-3">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 truncate">Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.productCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-lg p-3">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 truncate">Cashiers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cashierCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-6 py-4">
                <p className="text-sm font-medium text-primary-600">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500">No recent activity</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
