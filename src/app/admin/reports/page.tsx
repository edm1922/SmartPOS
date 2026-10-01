'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseDB } from '@/lib/supabaseClient';
import { useCurrency } from '@/context/CurrencyContext';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  FileText,
  CreditCard,
  Banknote,
  CalendarDays,
  HandCoins,
  Smartphone,
  ScrollText,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface Transaction {
  id: string;
  cashier_id: string;
  recorded_by_cashier_id?: string;
  total_amount: number;
  down_payment?: number;
  payment_method: string;
  status?: string;
  created_at: string;
  transaction_date?: string;
  // Mirrors the transactions.source CHECK constraint ('pos', 'manual').
  source?: 'pos' | 'manual';
  manual_ref?: string;
  voided_at?: string;
  customer_id?: string;
  customer_name?: string;
  is_down_payment?: boolean;
  cashier?: { email: string };
  transaction_items?: Array<{
    quantity: number;
    item_name?: string;
    products?: { name: string };
  }>;
}

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';
// 'pos' and 'manual' are the only values transactions.source accepts - see the
// CHECK constraint in add_manual_entry_schema.sql. A 'register' value here would
// match zero rows, so the Register tab silently showed an empty ledger.
type SourceFilter = 'combined' | 'pos' | 'manual';

// Shared window helper: the report ledger and the Down Payments monitor both
// need the exact same period so their "collected" figures agree.
function getReportWindow(
  range: DateRange,
  customStartDate: string,
  customEndDate: string
): { startIso: string; endIso: string | null } {
  const now = new Date();
  let startDate = new Date();
  let endIso: string | null = null;

  if (range === 'custom') {
    const endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(customStartDate);
    startDate.setHours(0, 0, 0, 0);
    endIso = endDate.toISOString();
  } else {
    switch (range) {
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
  }

  return { startIso: startDate.toISOString(), endIso };
}

export default function Reports() {
  const { formatPrice } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('combined');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [user, setUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    fetchSession();
  }, []);

  const reportWindow = useMemo(
    () => getReportWindow(dateRange, customStartDate, customEndDate),
    [dateRange, customStartDate, customEndDate]
  );

  useEffect(() => {
    fetchData();
  }, [dateRange, customStartDate, customEndDate, sourceFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { startIso, endIso } = reportWindow;

      let query = supabase
        .from('transactions')
        .select('*, transaction_items(quantity, item_name, products(name))')
        .eq('status', 'completed')
        .is('voided_at', null)
        .gte('transaction_date', startIso);

      if (endIso) query = query.lte('transaction_date', endIso);
      if (sourceFilter !== 'combined') query = query.eq('source', sourceFilter);

      const { data: transactionsData, error: transactionsError } = await query
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (transactionsError) throw transactionsError;

      const startDate = new Date(startIso);
      await processAndSetTransactions(
        transactionsData,
        startDate,
        endIso ? new Date(endIso) : undefined
      );
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processAndSetTransactions = async (transactionsData: any[] | null, startDate: Date, endDate?: Date) => {
    // Fetch all cashiers and users to map them manually
    const [ { data: cashiersData }, { data: usersData }, { data: customersData } ] = await Promise.all([
      supabase.from('cashiers').select('id, username, email'),
      supabase.from('users').select('id, email'),
      supabase.from('customers').select('id, name')
    ]);

    const cashierMap = new Map();
    (cashiersData || []).forEach(c => cashierMap.set(c.id, c.username || c.email));
    (usersData || []).forEach(u => cashierMap.set(u.id, u.email));

    const customerMap = new Map();
    (customersData || []).forEach(c => customerMap.set(c.id, c.name));

    // Fetch term payments (downpayments) in the same range
    let termQuery = supabase
      .from('term_payments')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    if (endDate) termQuery = termQuery.lte('created_at', endDate.toISOString());
    const { data: termPayments } = await termQuery;

    const rows = buildReportRows(transactionsData || [], termPayments || [], cashierMap, customerMap);
    setTransactions(rows);
  };

  const buildReportRows = (
    transactionsData: any[],
    termPayments: any[],
    cashierMap: Map<any, any>,
    customerMap: Map<any, any>
  ): Transaction[] => {
    const rows: Transaction[] = [];

    for (const t of transactionsData) {
      const isTerm = t.payment_method === 'term';
      const downPayment = Number(t.down_payment || 0);
      if (isTerm && downPayment <= 0) continue;

      // Manual entries have no cashier_id by design; attribute them to the
      // cashier who keyed them in so the column never reads "System".
      const attributedTo = t.source === 'manual' ? t.recorded_by_cashier_id : t.cashier_id;

      rows.push({
        ...t,
        total_amount: isTerm ? downPayment : Number(t.total_amount || 0),
        source: t.source || 'pos',
        transaction_date: t.transaction_date || t.created_at,
        cashier: { email: cashierMap.get(attributedTo) || 'System' },
        customer_name: t.customer_id ? customerMap.get(t.customer_id) || 'Unknown' : t.customer_name
      });
    }

    for (const p of termPayments) {
      rows.push({
        id: p.id,
        cashier_id: p.cashier_id,
        total_amount: p.amount,
        payment_method: 'downpayment',
        status: 'completed',
        created_at: p.created_at,
        transaction_date: p.created_at,
        source: 'pos',
        cashier: { email: cashierMap.get(p.cashier_id) || 'System' },
        customer_name: customerMap.get(p.customer_id) || 'Unknown',
        is_down_payment: true
      });
    }

    return rows.sort((a, b) => new Date(b.transaction_date || b.created_at).getTime() - new Date(a.transaction_date || a.created_at).getTime());
  };

  const getItemLabel = (item: { quantity: number; item_name?: string; products?: { name: string } }) => {
    // Manual book lines can be free text with no linked product, so item_name is
    // the only reliable label for those.
    const name = item.item_name || item.products?.name || 'Item';
    return `${item.quantity}x ${name}`;
  };

  const getTransactionDate = (t: Transaction) => t.transaction_date || t.created_at;

  const stats = useMemo(() => {
    const totalSales = transactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    const count = transactions.length;
    const avg = count > 0 ? totalSales / count : 0;
    const highest = transactions.reduce((max, t) => {
      const amount = Number(t.total_amount || 0);
      return amount > max ? amount : max;
    }, 0);

    const registerSales = transactions.reduce((sum, t) => sum + (t.source === 'manual' ? 0 : Number(t.total_amount || 0)), 0);
    const manualSales = transactions.reduce((sum, t) => sum + (t.source === 'manual' ? Number(t.total_amount || 0) : 0), 0);
    const manualCount = transactions.filter((t) => t.source === 'manual').length;

    // Payment method breakdown
    const methods = transactions.reduce((acc, t) => {
      const amount = Number(t.total_amount || 0);
      acc[t.payment_method] = (acc[t.payment_method] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    return { totalSales, count, avg, highest, methods, registerSales, manualSales, manualCount };
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
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'gcash':
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'cheque': return <ScrollText className="h-4 w-4" />;
      case 'term': return <CalendarDays className="h-4 w-4" />;
      case 'downpayment':
      case 'term_payment': return <HandCoins className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const sourceBadge = (t: Transaction) =>
    t.source === 'manual' ? (
      <span
        className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-300"
        title={t.manual_ref ? `BIR ${t.manual_ref}` : undefined}
      >
        Manual
      </span>
    ) : (
      <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-black uppercase text-foreground">
        Register
      </span>
    );

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Date', 'Source', 'BIR Serial', 'Cashier', 'Products', 'Payment Method', 'Total Amount', 'Status'];

    const rows = transactions.map(t => [
      new Date(getTransactionDate(t)).toLocaleString(),
      t.source === 'manual' ? 'Manual Entry' : 'Register',
      t.manual_ref || '',
      t.cashier?.email || 'System',
      t.is_down_payment
        ? `Downpayment from ${t.customer_name || 'Unknown'}`
        : t.transaction_items?.map(getItemLabel).join('; ') || '',
      t.payment_method,
      t.total_amount.toString(),
      t.status || 'Completed'
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProductsText = (t: Transaction) => {
    if (t.is_down_payment) return `Downpayment from ${t.customer_name || 'Unknown'}`;
    return t.transaction_items?.map((item) => `${item.quantity}x ${item.products?.name || 'Unknown'}`).join(', ') || '-';
  };

  const handleOpenDeleteModal = (t: Transaction) => {
    // Belt-and-braces: the button is already hidden for manual entries, but the
    // handler must refuse too, since the client-side fallback below deletes rows
    // directly and would otherwise bypass the RPC's admin/source checks.
    if (t.source === 'manual') {
      setDeleteError(
        'Manual book entries can only be voided from the Approvals page, with a reason.'
      );
      return;
    }
    setDeleteTarget(t);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return;
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }
    if (!user?.email) {
      setDeleteError('Unable to verify your session. Please sign out and sign back in.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      // Verify the admin's password before allowing the destructive action
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (authError) {
        setDeleteError('Incorrect password. Deletion cancelled.');
        setIsDeleting(false);
        return;
      }

      if (deleteTarget.is_down_payment) {
        const { error: rpcError } = await supabase.rpc('undo_term_payment', {
          p_payment_id: deleteTarget.id,
        });
        if (rpcError) {
          console.warn('RPC undo_term_payment failed, using fallback direct deletion:', rpcError);
          const { data: allocs } = await supabase
            .from('term_payment_allocations')
            .select('transaction_id, amount')
            .eq('term_payment_id', deleteTarget.id);

          if (allocs && allocs.length > 0) {
            for (const alloc of allocs) {
              const { data: tx } = await supabase
                .from('transactions')
                .select('term_paid_amount')
                .eq('id', alloc.transaction_id)
                .single();
              if (tx) {
                const newAmount = Math.max(0, (Number(tx.term_paid_amount) || 0) - Number(alloc.amount));
                await supabase
                  .from('transactions')
                  .update({ term_paid_amount: newAmount })
                  .eq('id', alloc.transaction_id);
              }
            }
          }

          await supabase.from('term_payment_allocations').delete().eq('term_payment_id', deleteTarget.id);
          const { error: deleteErr } = await supabase.from('term_payments').delete().eq('id', deleteTarget.id);
          if (deleteErr) throw deleteErr;
        }
      } else {
        const { error: rpcError } = await supabase.rpc('delete_transaction', {
          p_transaction_id: deleteTarget.id,
        });
        if (rpcError) {
          console.warn('RPC delete_transaction failed, using fallback direct deletion:', rpcError);
          // Restore stock for each item in the transaction
          const { data: items } = await supabase
            .from('transaction_items')
            .select('product_id, quantity')
            .eq('transaction_id', deleteTarget.id);

          if (items && items.length > 0) {
            for (const item of items) {
              if (item.product_id) {
                const { data: prod } = await supabase
                  .from('products')
                  .select('stock_quantity')
                  .eq('id', item.product_id)
                  .single();
                if (prod) {
                  await supabase
                    .from('products')
                    .update({ stock_quantity: (Number(prod.stock_quantity) || 0) + Number(item.quantity) })
                    .eq('id', item.product_id);
                }
              }
            }
          }

          // Remove term payment allocations
          await supabase.from('term_payment_allocations').delete().eq('transaction_id', deleteTarget.id);

          // Remove transaction items
          await supabase.from('transaction_items').delete().eq('transaction_id', deleteTarget.id);

          // Remove transaction
          const { error: deleteErr } = await supabase.from('transactions').delete().eq('id', deleteTarget.id);
          if (deleteErr) throw deleteErr;
        }
      }

      const label = `${deleteTarget.cashier?.email || 'System'} | ${formatDate(deleteTarget.created_at)} | ${formatPrice(deleteTarget.total_amount)}`;
      await supabaseDB.logActivity(user.id, 'Transaction Deleted', `Deleted ${deleteTarget.is_down_payment ? 'downpayment' : 'transaction'} (${label})`);

      const target = deleteTarget;
      handleCloseDeleteModal();
      setDeleteSuccess(`Transaction ${formatPrice(target.total_amount)} deleted permanently.`);
      setTimeout(() => setDeleteSuccess(null), 5000);
      fetchData();
    } catch (error: any) {
      console.error('Delete transaction error:', error);
      setDeleteError(error.message || 'Failed to delete transaction.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Transaction history and sales summary.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-muted border-none rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-ring outline-none"
              />
              <span className="text-xs font-bold text-muted-foreground uppercase">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-muted border-none rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          )}
          <div className="flex bg-muted p-1 rounded-lg w-fit">
            {(['today', 'week', 'month', 'year', 'custom'] as const).map(range => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
                className={`rounded-md transition-all ${dateRange === range ? 'shadow-sm' : ''}`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Source filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Manual book entries are dated by their BIR receipt date.
        </p>
        <div className="flex bg-muted p-1 rounded-lg w-fit self-start">
          {([
            { key: 'pos', label: 'Register' },
            { key: 'manual', label: 'Manual Entry' },
            { key: 'combined', label: 'Combined' },
          ] as const).map(s => (
            <Button
              key={s.key}
              variant={sourceFilter === s.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSourceFilter(s.key)}
              className={`rounded-md ${sourceFilter === s.key ? 'shadow-sm' : ''}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <section
        aria-label="Report summary"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rounded-lg border bg-card"
      >
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Money Collected</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(stats.totalSales)}</p>
          )}
          {!isLoading && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Register {formatPrice(stats.registerSales)} · Manual {formatPrice(stats.manualSales)}
            </p>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Transactions</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{stats.count.toString()}</p>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Average Spend</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(stats.avg)}</p>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Highest Sale</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(stats.highest)}</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table Container */}
        <Card className="lg:col-span-2 shadow-sm border-gray-100 dark:border-gray-800 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Transactions</h3>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead className="w-[100px]">Source</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 50).map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted transition-colors">
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(getTransactionDate(t))}
                          </TableCell>
                          <TableCell>
                            {sourceBadge(t)}
                          </TableCell>
                          <TableCell>
                            <span className="block truncate max-w-[150px] text-sm">{t.cashier?.email || 'System'}</span>
                          </TableCell>
                          <TableCell>
                            {t.is_down_payment ? (
                              <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={t.customer_name}>
                                Downpayment from {t.customer_name}
                              </div>
                            ) : (
                              <div
                                className="text-xs text-muted-foreground max-w-[200px] truncate"
                                title={t.transaction_items?.map(getItemLabel).join(', ') || ''}
                              >
                                {t.transaction_items?.map(getItemLabel).join(', ') || '-'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center capitalize whitespace-nowrap text-sm gap-1.5">
                              {getMethodIcon(t.payment_method)}
                              {t.payment_method}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatPrice(t.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Manual BIR entries are deliberately not hard-deletable
                                here. They must go through the auth-gated
                                void_manual_transaction(), which requires a reason and
                                preserves the serial as consumed. Hard-deleting one
                                would erase the BIR audit trail. */}
                            {t.source === 'manual' ? (
                              <span
                                title="Manual book entries can only be voided from the Approvals page"
                                className="inline-flex items-center text-muted-foreground"
                              >
                                <Lock className="h-4 w-4" />
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleOpenDeleteModal(t)}
                                variant="outline"
                                size="icon"
                                title={`Delete ${t.is_down_payment ? 'downpayment' : 'transaction'} (requires admin password)`}
                                className="h-8 w-8 rounded-md text-red-500 hover:text-red-700 hover:border-red-500/50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card rows */}
                <div className="md:hidden divide-y divide-border">
                  {transactions.slice(0, 50).map((t) => (
                    <div key={t.id} className="px-4 py-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium truncate">
                          {t.is_down_payment
                            ? `Downpayment from ${t.customer_name}`
                            : (t.transaction_items?.map(getItemLabel).join(', ') || '-')}
                        </p>
                        <span className="text-sm font-semibold tabular-nums shrink-0">{formatPrice(t.total_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground truncate">
                          {formatDate(getTransactionDate(t))} · {t.cashier?.email || 'System'}
                        </span>
                        {sourceBadge(t)}
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2.5 border-t">
                        <span className="inline-flex items-center capitalize text-xs gap-1.5">
                          {getMethodIcon(t.payment_method)}
                          {t.payment_method}
                        </span>
                        {t.source === 'manual' ? (
                          <span
                            title="Manual book entries can only be voided from the Approvals page"
                            className="inline-flex items-center text-muted-foreground"
                          >
                            <Lock className="h-4 w-4" />
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleOpenDeleteModal(t)}
                            variant="outline"
                            size="icon"
                            title={`Delete ${t.is_down_payment ? 'downpayment' : 'transaction'} (requires admin password)`}
                            className="h-8 w-8 rounded-md text-red-500 hover:text-red-700 hover:border-red-500/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {transactions.length === 0 && (
                  <div className="px-6 py-20 text-center">
                    <p className="text-sm text-muted-foreground">No transactions found for this period</p>
                  </div>
                )}
                {transactions.length > 50 && (
                  <div className="px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Showing last 50 of {transactions.length} transactions.
                    </p>
                    <Button variant="link" size="sm" className="ml-1" onClick={exportToCSV}>View all details</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Summaries */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-100 dark:border-gray-800 h-fit">
            <CardHeader className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Method Breakdown</h3>
            </CardHeader>
            <CardContent className="px-6 py-5">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : Object.keys(stats.methods).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(stats.methods).map(([method, amount]) => (
                    <div key={method}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-muted-foreground capitalize">{method}</span>
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(amount)}</span>
                      </div>
                      <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-700"
                          style={{ width: `${stats.totalSales > 0 ? (amount / stats.totalSales) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-right text-muted-foreground mt-1">
                        {((amount / (stats.totalSales || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {deleteSuccess && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl shadow-lg border border-green-200 dark:border-green-800 animate-in slide-in-from-bottom duration-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-bold">{deleteSuccess}</span>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={handleCloseDeleteModal}
        title={deleteTarget?.is_down_payment ? 'Delete Downpayment' : 'Delete Transaction'}
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-700 dark:text-red-400">
                  This permanently deletes this {deleteTarget.is_down_payment ? 'downpayment' : 'transaction'}.
                </p>
                <p className="text-red-600/80 dark:text-red-400/80 mt-1 text-xs">
                  Product stock is restored and the record is removed from all reports. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">{new Date(deleteTarget.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cashier</span>
                <span className="font-semibold">{deleteTarget.cashier?.email || 'System'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Details</span>
                <span className="font-semibold text-right">{getProductsText(deleteTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-semibold capitalize">{deleteTarget.payment_method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-black text-red-600 dark:text-red-400">{formatPrice(deleteTarget.total_amount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Enter admin password to confirm
              </label>
              <div className="relative">
                <Input
                  type={showDeletePassword ? 'text' : 'password'}
                  placeholder="Admin password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isDeleting) handleDeleteTransaction();
                  }}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                >
                  {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {deleteError && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> {deleteError}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={handleCloseDeleteModal} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteTransaction}
                disabled={isDeleting || !deletePassword}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete {deleteTarget.is_down_payment ? 'Downpayment' : 'Transaction'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
