'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrency } from '@/context/CurrencyContext';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  Calendar,
  History,
  FileText,
  DollarSign,
  ArrowUpRight,
  CreditCard,
  Banknote
} from 'lucide-react';

interface Transaction {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  cashier?: { email: string };
}

type DateRange = 'today' | 'week' | 'month' | 'year';

export default function Reports() {
  const { formatPrice } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          cashier_id,
          total_amount,
          payment_method,
          created_at,
          users(email)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions((data || []).map(t => {
        const user = Array.isArray(t.users) ? t.users[0] : t.users;
        return {
          ...t,
          cashier: user ? { email: user.email } : undefined
        };
      }));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const count = transactions.length;
    const avg = count > 0 ? totalSales / count : 0;
    const highest = transactions.reduce((max, t) => t.total_amount > max ? t.total_amount : max, 0);

    // Payment method breakdown
    const methods = transactions.reduce((acc, t) => {
      acc[t.payment_method] = (acc[t.payment_method] || 0) + t.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return { totalSales, count, avg, highest, methods };
  }, [transactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (dateRange === 'today') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <Banknote className="h-4 w-4 mr-1" />;
      case 'gcash':
      case 'card': return <CreditCard className="h-4 w-4 mr-1" />;
      default: return <Wallet className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Sales Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoring business performance and transaction history.
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['today', 'week', 'month', 'year'] as const).map(range => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateRange(range)}
              className={`rounded-lg transition-all ${dateRange === range ? 'shadow-sm' : ''}`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalSales)}
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
          loading={isLoading}
          trend="+12.5% from last period" // Mock trend
          trendColor="text-green-500"
        />
        <StatCard
          title="Transactions"
          value={stats.count.toString()}
          icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Average Spend"
          value={formatPrice(stats.avg)}
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Highest Sale"
          value={formatPrice(stats.highest)}
          icon={<ArrowUpRight className="h-5 w-5 text-purple-500" />}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table Container */}
        <Card className="lg:col-span-2 shadow-sm border-gray-100 dark:border-gray-800 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 border-b">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Date & Time</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 50).map((t) => (
                      <TableRow key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell className="font-medium text-gray-600 dark:text-gray-400">
                          {formatDate(t.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {t.cashier?.email.substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="truncate max-w-[150px]">{t.cashier?.email || 'System'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize flex w-fit items-center px-2 py-0.5">
                            {getMethodIcon(t.payment_method)}
                            {t.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900 dark:text-white">
                          {formatPrice(t.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {transactions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-4 opacity-20" />
                    <p>No transactions found for this period</p>
                  </div>
                )}
                {transactions.length > 50 && (
                  <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-muted-foreground">
                      Showing last 50 of {transactions.length} transactions.
                      <Button variant="link" size="sm" className="ml-1">View all details</Button>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Summaries */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-100 dark:border-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-gray-500" />
                Method Breakdown
              </h3>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : Object.keys(stats.methods).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(stats.methods).map(([method, amount]) => (
                    <div key={method} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize flex items-center">
                          {getMethodIcon(method)}
                          {method}
                        </span>
                        <span className="text-sm font-bold">{formatPrice(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000 ease-out"
                          style={{ width: `${(amount / stats.totalSales) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-right text-muted-foreground mt-1">
                        {((amount / stats.totalSales) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm italic">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-24 w-24" />
            </div>
            <CardContent className="pt-6 relative z-10">
              <p className="text-primary-foreground/80 text-sm font-medium">Business Performance</p>
              <h4 className="text-xl font-bold mt-1">Steady Growth</h4>
              <p className="text-xs mt-4 leading-relaxed opacity-90">
                You've processed <strong>{stats.count} transactions</strong> in the selected period, with a total volume of <strong>{formatPrice(stats.totalSales)}</strong>.
              </p>
              <Button variant="secondary" className="w-full mt-6 bg-white text-primary hover:bg-gray-100 font-semibold shadow-sm">
                Generate Full Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, trend, trendColor = "text-muted-foreground" }: any) {
  return (
    <Card className="hover:shadow-md transition-all duration-300 border-gray-100 dark:border-gray-800 overflow-hidden relative">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            )}
            {trend && !loading && (
              <p className={`text-[10px] font-medium ${trendColor} flex items-center mt-1`}>
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl group">
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}
