'use client';

// Term Accounts: the admin's home for receivables.
//
// This page owns three things that used to be scattered or did not exist:
//   1. The Down Payments monitor (moved off the Reports page).
//   2. A customer search, so receivables are reachable by name rather than only
//      by scrolling the ledger.
//   3. The term-payment audit trail. Cashiers record payments but cannot edit or
//      undo them, so the log is how an admin verifies what the register did.
//
// Outstanding balances are all-time, not period-scoped: a debt from last year is
// still owed today. Only the "collected in period" figures follow the date
// picker, matching the rule the Down Payments section already used.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrency } from '@/context/CurrencyContext';
import DownpaymentsSection from '@/components/admin/DownpaymentsSection';
import { CustomerDetailModal } from '@/components/admin/CustomerDetailModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Check,
  HandCoins,
  ScrollText,
  Search,
} from 'lucide-react';

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all-time';

interface AuditEntry {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
  actor_role: string | null;
  // Supabase returns an embedded to-one relation as an array, not an object.
  users: { email: string }[] | null;
}

interface AccountSummary {
  id: string;
  name: string;
  createdAt: string | null;
  outstanding: number;
  overdue: number;
  openAccounts: number;
  override: number;
  overrideUpdatedAt: string | null;
  overrideAgeDays: number | null;
  totalPaid: number;
  paymentCount: number;
  lastPaidAt: string | null;
  settled: boolean;
}

// Short readable date for payment info, e.g. "Jul 28, 2026".
function formatShortDate(value: string | null | undefined) {
  if (!value) return '';
  const iso = value.includes('T') ? value.slice(0, 10) : value;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Whole days since a date, e.g. 78 for a balance set on Jul 14, 2026.
function daysSince(value: string | null | undefined) {
  if (!value) return NaN;
  const iso = value.includes('T') ? value.slice(0, 10) : value;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return NaN;
  const then = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then) / 86400000);
}

// A manual balance has no due date, so it is treated as overdue once it has been
// outstanding past this window since it was last set.
const OVERRIDE_GRACE_DAYS = 60;

const RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all-time', label: 'All Time' },
];

// All-time means "no lower bound", so the start stays null rather than
// defaulting to a date that would hide older receivables.
function getReportWindow(
  range: DateRange
): { startIso: string; endIso: string | null } {
  const now = new Date();
  const endIso = now.toISOString();
  if (range === 'all-time') return { startIso: '1970-01-01', endIso: null };

  const start = new Date(now);
  if (range === 'today') start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - 7);
  if (range === 'month') start.setMonth(start.getMonth() - 1);
  if (range === 'year') start.setFullYear(start.getFullYear() - 1);
  return { startIso: start.toISOString(), endIso };
}

const ACTION_LABELS: Record<string, string> = {
  term_payment_recorded: 'Term payment recorded',
  term_payment_undone: 'Term payment undone',
};

export default function TermAccountsPage() {
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState<'accounts' | 'audit'>('accounts');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [search, setSearch] = useState('');

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  const openCustomerDetail = (account: AccountSummary) => {
    if (account.id === '__unassigned__') return;
    setSelectedAccount(account);
    setIsCustomerDetailOpen(true);
  };

  const reportWindow = useMemo(() => getReportWindow(dateRange), [dateRange]);

  // Per-customer receivables. Computed in one pass over the term transactions
  // rather than a query per customer, which is what the register does and what
  // made this view slow to open.
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      // Not destructured: PostgREST returns { data, error } and destructuring
      // the pair in Promise.all would drop the error side of each result.
      const txResult = await supabase
        .from('transactions')
        .select('id, customer_id, total_amount, term_remaining_balance, term_paid_amount, term_due_date, term_status')
        .eq('payment_method', 'term')
        .is('voided_at', null);
      // select('*') keeps this working even before the balance_override_updated_at
      // migration is applied to the live database - PostgREST would reject an
      // explicit select of a column it does not know about yet.
      const customerResult = await supabase.from('customers').select('*');
      const paymentResult = await supabase
        .from('term_payments')
        .select('customer_id, amount, created_at');

      if (txResult.error) throw txResult.error;
      if (customerResult.error) throw customerResult.error;
      if (paymentResult.error) throw paymentResult.error;

      const txs = txResult.data || [];
      const customers = customerResult.data || [];
      const payments = paymentResult.data || [];

      const nameById = new Map(customers.map((c) => [c.id, c.name]));
      const overrideById = new Map(
        customers.map((c) => [c.id, Number(c.balance_override || 0)])
      );
      const overrideUpdatedAtById = new Map(
        customers.map((c) => [
          c.id,
          // Dedicated timestamp after the migration; updated_at is the closest
          // prior record for any row the backfill missed.
          (c.balance_override_updated_at as string | null) || (c.updated_at as string | null) || null,
        ])
      );
      const createdAtById = new Map(
        customers.map((c) => [c.id, (c.created_at as string | null) || null])
      );

      // Total ever collected from each customer, legacy and current. Under the
      // old flow a paid account only had term_payments + balance_override, with
      // no transactions row at all - so settled customers need to be seeded from
      // here too or they would vanish from the roster. Dates are kept so admins
      // can tie the paid amount to when it actually came in.
      const paidByCustomer = new Map<
        string,
        { total: number; count: number; lastAt: string | null }
      >();
      for (const p of payments) {
        const customerId = p.customer_id as string | null;
        if (!customerId) continue;
        const current = paidByCustomer.get(customerId) || { total: 0, count: 0, lastAt: null };
        current.total += Number(p.amount || 0);
        current.count += 1;
        const at = p.created_at as string | null;
        if (at && (!current.lastAt || at > current.lastAt)) current.lastAt = at;
        paidByCustomer.set(customerId, current);
      }

      const byCustomer = new Map<string, AccountSummary>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const tx of txs) {
        const customerId = tx.customer_id as string | null;
        // A manual BIR sale with no customer creates a real receivable that
        // cannot be collected from. It is surfaced as "Unassigned" rather than
        // dropped, so the money owed is never invisible.
        const key = customerId || '__unassigned__';
        const existing = byCustomer.get(key) || {
          id: key,
          name: customerId ? nameById.get(customerId) || 'Unknown' : 'Unassigned',
          createdAt: createdAtById.get(customerId || '') || null,
          outstanding: 0,
          overdue: 0,
          openAccounts: 0,
          override: overrideById.get(customerId || '') || 0,
          overrideUpdatedAt: overrideUpdatedAtById.get(customerId || '') || null,
          overrideAgeDays: null,
          totalPaid: 0,
          paymentCount: 0,
          lastPaidAt: null,
          settled: false,
        };

        const owed = Math.max(
          0,
          (Number(tx.term_remaining_balance) || Number(tx.total_amount) || 0) -
            (Number(tx.term_paid_amount) || 0)
        );

        if (owed > 0) {
          existing.outstanding += owed;
          existing.openAccounts += 1;
          if (tx.term_due_date && new Date(tx.term_due_date) < today) {
            existing.overdue += owed;
          }
        }

        byCustomer.set(key, existing);
      }

      // Customers whose only receivable is an unlinked balance_override have no
      // term transaction row, so the loop above never sees them. Add them so the
      // roster covers every account, past and present.
      for (const customer of customers) {
        const override = Number(customer.balance_override || 0);
        if (override <= 0 || byCustomer.has(customer.id)) continue;
        byCustomer.set(customer.id, {
          id: customer.id,
          name: customer.name || 'Unknown',
          createdAt: (customer.created_at as string | null) || null,
          outstanding: 0,
          overdue: 0,
          openAccounts: 0,
          override,
          overrideUpdatedAt:
              (customer.balance_override_updated_at as string | null) ||
              (customer.updated_at as string | null) ||
              null,
          overrideAgeDays: null,
          totalPaid: 0,
          paymentCount: 0,
          lastPaidAt: null,
          settled: false,
        });
      }

      // Legacy fully-paid accounts: a customer recorded only in term_payments
      // (paid off, no balance_override, no transactions row) would otherwise be
      // invisible. Seed them so settled accounts stay in the roster.
      for (const customer of customers) {
        if (byCustomer.has(customer.id) || !paidByCustomer.has(customer.id)) continue;
        byCustomer.set(customer.id, {
          id: customer.id,
          name: customer.name || 'Unknown',
          createdAt: (customer.created_at as string | null) || null,
          outstanding: 0,
          overdue: 0,
          openAccounts: 0,
          override: 0,
          overrideUpdatedAt:
              (customer.balance_override_updated_at as string | null) ||
              (customer.updated_at as string | null) ||
              null,
          overrideAgeDays: null,
          totalPaid: 0,
          paymentCount: 0,
          lastPaidAt: null,
          settled: false,
        });
      }

      const rows = Array.from(byCustomer.values())
        .map((r) => {
          const outstanding = r.outstanding + Math.max(0, r.override);
          const paid = paidByCustomer.get(r.id === '__unassigned__' ? '' : r.id);
          const overrideAgeDays = r.override > 0 ? daysSince(r.overrideUpdatedAt) : NaN;
          // Aged manual balances count as overdue too - an unlinked balance that
          // has sat past the grace window is past due even without a due date.
          const agedOverride =
            r.override > 0 && !Number.isNaN(overrideAgeDays) && overrideAgeDays > OVERRIDE_GRACE_DAYS
              ? r.override
              : 0;
          return {
            ...r,
            outstanding,
            overdue: r.overdue + agedOverride,
            overrideAgeDays: Number.isNaN(overrideAgeDays) ? null : overrideAgeDays,
            totalPaid: (paid?.total || 0) + r.totalPaid,
            paymentCount: (paid?.count || 0) + r.paymentCount,
            lastPaidAt: paid?.lastAt || r.lastPaidAt,
            settled: outstanding <= 0 && r.openAccounts === 0 && r.override <= 0,
          };
        })
        .sort((a, b) => {
          if (a.settled !== b.settled) return a.settled ? 1 : -1;
          if (b.overdue !== a.overdue) return b.overdue - a.overdue;
          return b.outstanding - a.outstanding;
        });

      setAccounts(rows);
    } catch (error) {
      console.error('Error fetching term accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // The audit trail reads activity_logs for term events only. Cashiers cannot
  // write here directly (they hold the anon key and have no auth.uid()); the
  // record_term_payment RPC writes these rows server-side, so anything missing
  // here is a payment that never completed.
  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, description, created_at, actor_role, users(email)')
        .in('action', ['term_payment_recorded', 'term_payment_undone'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAudit((data || []) as AuditEntry[]);
    } catch (error) {
      console.error('Error fetching term payment audit trail:', error);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (tab === 'audit') fetchAudit();
  }, [tab, fetchAudit]);

  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(term));
  }, [accounts, search]);

  const totals = useMemo(
    () =>
      visibleAccounts.reduce(
        (acc, a) => ({
          outstanding: acc.outstanding + a.outstanding,
          overdue: acc.overdue + a.overdue,
          open: acc.open + a.openAccounts,
          settled: acc.settled + (a.settled ? 1 : 0),
          active: acc.active + (a.settled ? 0 : 1),
        }),
        { outstanding: 0, overdue: 0, open: 0, settled: 0, active: 0 }
      ),
    [visibleAccounts]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Term Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cashiers record payments; admins review, correct, and undo them.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={tab === 'accounts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('accounts')}
            className={`rounded-md gap-1.5 ${tab === 'accounts' ? 'shadow-sm' : ''}`}
          >
            <HandCoins className="h-3.5 w-3.5" /> Accounts
          </Button>
          <Button
            variant={tab === 'audit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('audit')}
            className={`rounded-md gap-1.5 ${tab === 'audit' ? 'shadow-sm' : ''}`}
          >
            <ScrollText className="h-3.5 w-3.5" /> Audit Trail
          </Button>
        </div>
      </div>

      {tab === 'accounts' && (
        <>
          {/* Search + summary. The date picker only affects the collected figures
              in the monitor below; the balances here are always as of today. */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-muted border-none focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Collected since
              </span>
              <div className="flex bg-muted p-1 rounded-lg">
                {RANGE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.key}
                    variant={dateRange === opt.key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDateRange(opt.key)}
                    className={`rounded-md ${dateRange === opt.key ? 'shadow-sm' : ''}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <section
            aria-label="Term accounts summary"
            className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x rounded-lg border bg-card"
          >
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total Outstanding
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                {formatPrice(totals.outstanding)}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Overdue
              </p>
              <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${totals.overdue > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {formatPrice(totals.overdue)}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Open Accounts
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{totals.open}</p>
            </div>
          </section>

          <div className="rounded-lg border bg-card overflow-hidden">
            {accountsLoading ? (
              <div className="p-6 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : visibleAccounts.length > 0 ? (
              <div className="divide-y divide-border">
                <div className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground border-b">
                  All Term Accounts · {totals.active} active · {totals.settled} settled
                </div>
                {visibleAccounts.map((a) => (
                  <div
                    key={a.id}
                    onDoubleClick={() => openCustomerDetail(a)}
                    title={
                      a.id === '__unassigned__'
                        ? undefined
                        : 'Double-click to view full transaction details'
                    }
                    className={`px-6 py-4 flex items-center justify-between gap-4 transition-colors ${
                      a.id === '__unassigned__' ? '' : 'cursor-pointer hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {a.id === '__unassigned__' && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          {a.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.settled
                            ? 'Paid in full'
                            : a.openAccounts > 0
                            ? `${a.openAccounts} open account${a.openAccounts === 1 ? '' : 's'}`
                            : 'Manual balance'}
                          {!a.settled && a.overdue > 0 && ` - ${formatPrice(a.overdue)} overdue`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {a.settled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5">
                          <Check className="h-3 w-3" /> Settled
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                            a.overdue > 0
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                              : 'text-foreground bg-muted'
                          }`}
                        >
                          {a.overdue > 0 && <AlertTriangle className="h-3 w-3" />}
                          {a.overdue > 0 ? 'Overdue' : 'Active'}
                        </span>
                      )}
                      <p className={`text-sm font-bold tabular-nums mt-1 ${
                        a.settled ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                      }`}>
                        {a.settled ? 'Paid' : formatPrice(a.outstanding)}
                      </p>
                      {a.override !== 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          incl. {formatPrice(a.override)} manual balance
                          {a.overrideUpdatedAt ? ` · since ${formatShortDate(a.overrideUpdatedAt)}` : ''}
                          {a.overrideAgeDays !== null && a.overrideAgeDays !== undefined
                            ? ` · ${a.overrideAgeDays} day${a.overrideAgeDays === 1 ? '' : 's'}`
                            : ''}
                        </p>
                      )}
                      {a.totalPaid > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Paid {formatPrice(a.totalPaid)}
                          {a.paymentCount > 1 ? ` (${a.paymentCount} payments)` : ''}
                          {a.lastPaidAt ? ` · ${formatShortDate(a.lastPaidAt)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {search.trim() ? 'No matching customers' : 'No term accounts yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {search.trim()
                    ? 'Try a different name.'
                    : 'Term sales will appear here once cashiers record them.'}
                </p>
              </div>
            )}
          </div>

          {/* The detailed monitor: per-transaction drill-down, FIFO allocation
              targets, record, and undo. It shares the search bar above so the
              whole page narrows together. */}
          <DownpaymentsSection
            period={reportWindow}
            onRecorded={fetchAccounts}
            searchTerm={search}
          />
        </>
      )}

      {tab === 'audit' && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Term Payment Audit Trail
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every payment recorded at the register, newest first. This is the
              record an admin checks after a disputed collection.
            </p>
          </div>
          {auditLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : audit.length > 0 ? (
            <div className="divide-y divide-border">
              {audit.map((entry) => (
                <div key={entry.id} className="px-6 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">No term payments recorded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Entries appear here once a cashier takes a term payment.
              </p>
            </div>
          )}
        </div>
      )}

      <CustomerDetailModal
        customer={
          selectedAccount
            ? {
                id: selectedAccount.id,
                name: selectedAccount.name,
                created_at: selectedAccount.createdAt || new Date().toISOString(),
              }
            : null
        }
        isOpen={isCustomerDetailOpen}
        onClose={() => setIsCustomerDetailOpen(false)}
      />
    </div>
  );
}
