'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrency } from '@/context/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    registerRevenue: 0,
    manualRevenue: 0,
    productCount: 0,
    cashierCount: 0,
    todaySales: 0,
    pendingManual: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: productCount },
        { count: cashierCount },
        { data: allTransactions },
        { data: todayTransactions },
        { data: activityLogs },
        { data: latestTransactionsData },
        { count: pendingManualCount }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('cashiers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('transactions').select('total_amount, source').eq('status', 'completed').is('voided_at', null),
        supabase
          .from('transactions')
          .select('total_amount, source')
          .eq('status', 'completed')
          .is('voided_at', null)
          .gte('transaction_date', today.toISOString().slice(0, 10)),
        supabase.from('activity_logs').select('*, users(email)').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('manual_entry_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Manual entries are back-filled onto their BIR date, so they can land in a
      // different day than the POS register total. Keep the two streams separate
      // and expose both instead of silently merging them.
      const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.total_amount || 0), 0) || 0;
      const registerRevenue = allTransactions?.reduce((sum, t) => sum + (t.source === 'manual' ? 0 : Number(t.total_amount || 0)), 0) || 0;
      const manualRevenue = allTransactions?.reduce((sum, t) => sum + (t.source === 'manual' ? Number(t.total_amount || 0) : 0), 0) || 0;
      const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount || 0), 0) || 0;

      setStats({
        totalRevenue,
        registerRevenue,
        manualRevenue,
        productCount: productCount || 0,
        cashierCount: cashierCount || 0,
        todaySales,
        pendingManual: pendingManualCount || 0
      });

      // Pre-fetch names for mapping
      const [ { data: allCashiers }, { data: allUsers } ] = await Promise.all([
        supabase.from('cashiers').select('id, username, email'),
        supabase.from('users').select('id, email')
      ]);

      const nameMap = new Map();
      (allCashiers || []).forEach(c => nameMap.set(c.id, c.username || c.email));
      (allUsers || []).forEach(u => nameMap.set(u.id, u.email));

      const activity = [
        ...(latestTransactionsData || []).map((t: any) => ({
          id: t.id,
          action: 'Sale completed',
          description: `Sale of ${formatPrice(Number(t.total_amount || 0))}`,
          user: nameMap.get(t.cashier_id) || 'System',
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

  const todayLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const secondaryMetrics = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue) },
    { label: 'Products', value: String(stats.productCount) },
    { label: 'Active Staff', value: String(stats.cashierCount) },
  ];

  const salesRows = [
    { label: 'Register Sales', value: formatPrice(stats.registerRevenue) },
    { label: 'Manual Entry', value: formatPrice(stats.manualRevenue) },
  ];

  const pending = stats.pendingManual;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Business activity at a glance</p>
      </div>

      {/* Primary KPI */}
      <section
        aria-labelledby="today-sales-heading"
        className="rounded-lg border bg-card px-6 py-7 lg:px-8 lg:py-9"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="today-sales-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Today's Sales
            </h2>
            <div className="mt-2 lg:mt-3">
              {loading ? (
                <Skeleton className="h-12 lg:h-14 w-52 lg:w-64" />
              ) : (
                <p className="text-4xl lg:text-5xl font-bold tracking-tight tabular-nums">
                  {formatPrice(stats.todaySales)}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground pb-1">{todayLabel}</p>
        </div>
      </section>

      {/* Secondary KPIs */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x rounded-lg border bg-card"
      >
        {secondaryMetrics.map((metric) => (
          <div key={metric.label} className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{metric.label}</p>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold tracking-tight tabular-nums">{metric.value}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Sales breakdown + Attention */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-labelledby="sales-heading" className="lg:col-span-2 rounded-lg border bg-card">
          <header className="px-6 pt-5 pb-3 border-b">
            <h2 id="sales-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sales
            </h2>
          </header>
          <div className="px-6 divide-y">
            {salesRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-medium tabular-nums">
                  {loading ? '—' : row.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold tabular-nums">
                {loading ? '—' : formatPrice(stats.totalRevenue)}
              </span>
            </div>
          </div>
        </section>

        {/* Attention */}
        <a
          href="/admin/approvals"
          aria-label="Go to pending approvals"
          className={`group flex flex-col justify-between rounded-lg border bg-card px-6 py-5 transition-colors ${pending > 0 ? 'border-amber-500/40' : ''}`}
        >
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${pending > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            Attention
          </p>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <div>
              <div className="mb-1">
                {loading ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <p className={`text-3xl font-bold tracking-tight tabular-nums ${pending > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                    {pending}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {pending > 0
                  ? `${pending} request${pending === 1 ? '' : 's'} require review`
                  : 'No approvals waiting'}
              </p>
            </div>
            <ArrowRight
              className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${pending > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}
              aria-hidden="true"
            />
          </div>
        </a>
      </div>

      {/* Recent activity */}
      <section aria-labelledby="activity-heading" className="rounded-lg border bg-card overflow-hidden">
        <header className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
          <h2 id="activity-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Activity
          </h2>
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </header>
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recentActivity.length > 0 ? (
          <ul className="divide-y">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-6 py-4 hover:bg-muted transition-colors">
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium truncate text-foreground">{activity.action}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(activity.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.user}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-12 text-sm text-muted-foreground text-center">No activity recorded</p>
        )}
        <div className="border-t px-6 py-3 flex justify-end">
          <a
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            View Detailed Reports
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}