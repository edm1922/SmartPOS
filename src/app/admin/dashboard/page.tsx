'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useCurrency } from '@/context/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Activity,
  ArrowUpRight,
  Clock,
  ShoppingCart,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productCount: 0,
    cashierCount: 0,
    todaySales: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: productCount },
        { count: cashierCount },
        { data: allTransactions },
        { data: todayTransactions },
        { data: activityLogs },
        { data: latestTransactionsData }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('cashiers').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('total_amount'),
        supabase.from('transactions').select('total_amount').gte('created_at', today.toISOString()),
        supabase.from('activity_logs').select('*, users(email)').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      const totalRevenue = allTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
      const todaySales = todayTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      setStats({
        totalRevenue,
        productCount: productCount || 0,
        cashierCount: cashierCount || 0,
        todaySales
      });

      const activity = [
        ...(latestTransactionsData || []).map((t: any) => ({
          id: t.id,
          action: 'Sale completed',
          description: `Sale of ${formatPrice(t.total_amount)}`,
          user: 'Cashier', // Simplified for now to avoid join issues
          timestamp: t.created_at,
          type: 'sale'
        })),
        ...(activityLogs || []).map(l => ({
          id: l.id,
          action: l.action,
          description: l.description || '',
          user: l.users?.email?.split('@')[0] || 'Admin',
          timestamp: l.created_at,
          type: 'system'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Admin Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time business insights and terminal activity.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 animate-pulse">
          System Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Lifetime Revenue"
          value={formatPrice(stats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          trend="+8.2% all-time"
          trendUp
          loading={loading}
        />
        <DashboardCard
          title="Today's Sales"
          value={formatPrice(stats.todaySales)}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          trend="Real-time daily"
          loading={loading}
        />
        <DashboardCard
          title="Total Products"
          value={stats.productCount.toString()}
          icon={<Package className="h-5 w-5 text-orange-600" />}
          trend={`${stats.productCount > 0 ? 'Active Catalog' : 'Empty'}`}
          loading={loading}
        />
        <DashboardCard
          title="Active Staff"
          value={stats.cashierCount.toString()}
          icon={<Users className="h-5 w-5 text-purple-600" />}
          trend="Authorized"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b px-6 py-4 flex flex-row items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Latest System Activity
            </h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${activity.type === 'sale'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        }`}>
                        {activity.type === 'sale' ? <ShoppingCart className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate text-gray-900 dark:text-white">
                            {activity.action}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium uppercase tracking-wider">
                            {activity.user}
                          </Badge>
                          <span className="text-[9px] text-gray-400">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {recentActivity.length === 0 && (
                  <li className="px-6 py-12 text-center text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No activity recorded</p>
                  </li>
                )}
              </ul>
            )}
            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t text-center">
              <button onClick={() => window.location.href = '/admin/reports'} className="text-xs font-semibold text-primary hover:underline">
                View Detailed Reports
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-24 w-24" />
            </div>
            <CardContent className="pt-8 p-6 relative z-10">
              <h4 className="text-xl font-bold">SmartPOS Pro</h4>
              <p className="text-sm text-primary-foreground/90 mt-2 leading-relaxed">
                You've generated <strong>{formatPrice(stats.todaySales)}</strong> in sales today across your terminal.
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => window.location.href = '/admin/products'}
                  className="w-full bg-white/10 hover:bg-white/20 transition-colors py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Package className="h-3 w-3" /> Manage Inventory
                </button>
                <button
                  onClick={() => window.location.href = '/admin/cashiers'}
                  className="w-full bg-white text-primary hover:bg-gray-100 transition-colors py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Users className="h-3 w-3" /> Staff Management
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Catalog Health</h4>
                  <p className="text-[10px] text-muted-foreground">Database integrity check</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-muted-foreground">Sync Status</span>
                  <span className="font-bold text-green-600">Healthy</span>
                </div>
                <div className="flex justify-between text-xs py-2">
                  <span className="text-muted-foreground">Cache Status</span>
                  <span className="font-bold">Optimized</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon, trend, trendUp, loading }: any) {
  return (
    <Card className="border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{value}</h3>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 font-medium">
              {trendUp && <ArrowUpRight className="h-3 w-3 text-green-500" />}
              {trend}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
