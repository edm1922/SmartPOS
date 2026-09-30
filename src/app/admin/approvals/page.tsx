'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/Modal';
import { useCurrency } from '@/context/CurrencyContext';
import type { ManualEntryRequest } from '@/types/database';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from 'lucide-react';

type Filter = 'pending' | 'approved' | 'rejected';

interface ReviewResult {
  request_id: string;
  status: 'approved' | 'rejected' | 'failed';
  message?: string;
  transaction_id?: string;
  total?: number;
}

export default function ManualApprovals() {
  const { formatPrice } = useCurrency();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('pending');
  const [requests, setRequests] = useState<ManualEntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReviewResult[]>([]);

  // Reject dialog
  const [rejectTargets, setRejectTargets] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState('');

  // Void dialog
  const [voidTarget, setVoidTarget] = useState<ManualEntryRequest | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('manual_entry_requests')
        .select('*')
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setRequests((data as ManualEntryRequest[]) || []);
      setSelected(new Set());
    } catch (err: any) {
      console.error('Error fetching manual entry requests:', err);
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingTotal = useMemo(
    () => requests.reduce((s, r) => s + (Number(r.computed_total) || 0), 0),
    [requests]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === requests.length) setSelected(new Set());
    else setSelected(new Set(requests.map((r) => r.id)));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runReview = async (ids: string[], approve: boolean, note?: string) => {
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const { data, error: err } = await supabase.rpc('review_manual_entry_request', {
        p_request_ids: ids,
        p_approve: approve,
        p_note: note ?? null,
      });
      if (err) throw err;

      const body = data as { results?: ReviewResult[] };
      setResults(body?.results || []);
      await fetchRequests();
    } catch (err: any) {
      console.error('Review error:', err);
      setError(err.message || 'Failed to review the request.');
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget?.resulting_transaction_id) return;
    if (!voidReason.trim()) {
      setError('A reason is required to void an entry.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.rpc('void_manual_transaction', {
        p_transaction_id: voidTarget.resulting_transaction_id,
        p_reason: voidReason.trim(),
      });
      if (err) throw err;
      setVoidTarget(null);
      setVoidReason('');
      await fetchRequests();
    } catch (err: any) {
      console.error('Void error:', err);
      setError(err.message || 'Failed to void the entry.');
    } finally {
      setBusy(false);
    }
  };

  const failures = results.filter((r) => r.status === 'failed');
  const succeeded = results.length - failures.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manual Entry Approvals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cashier-submitted BIR manual sales book entries. Nothing here affects revenue or stock until approved.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg w-fit">
          {(['pending', 'approved', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className={`rounded-md capitalize ${filter === f ? 'shadow-sm' : ''}`}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            failures.length > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          <p className="text-sm font-semibold text-foreground">
            {succeeded} succeeded{failures.length > 0 ? `, ${failures.length} failed` : ''}
          </p>
          {failures.map((f) => (
            <p key={f.request_id} className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1">
              {f.request_id?.slice(0, 8)}: {f.message}
            </p>
          ))}
        </div>
      )}

      {filter === 'pending' && requests.length > 0 && (
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === requests.length && requests.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary"
                />
                Select all
              </label>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {selected.size} selected · {formatPrice(pendingTotal)} total
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTargets(Array.from(selected));
                  setRejectNote('');
                }}
                disabled={selected.size === 0 || busy}
                className="font-semibold uppercase text-xs"
              >
                <Ban className="h-4 w-4 mr-1" /> Reject Selected
              </Button>
              <Button
                onClick={() => runReview(Array.from(selected), true)}
                disabled={selected.size === 0 || busy}
                className="font-semibold uppercase text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Approve Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">No {filter} manual entries</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'pending'
                ? 'Cashier submissions will appear here for review.'
                : `Nothing has been ${filter} yet.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              selected={selected.has(req.id)}
              expanded={expanded.has(req.id)}
              busy={busy}
              onToggleSelect={() => toggleSelect(req.id)}
              onToggleExpand={() => toggleExpand(req.id)}
              onApprove={() => runReview([req.id], true)}
              onReject={() => {
                setRejectTargets([req.id]);
                setRejectNote('');
              }}
              onVoid={() => {
                setVoidTarget(req);
                setVoidReason('');
              }}
            />
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Modal
        isOpen={rejectTargets.length > 0}
        onClose={() => setRejectTargets([])}
        title={`Reject ${rejectTargets.length} request${rejectTargets.length === 1 ? '' : 's'}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The cashier sees this reason and can edit and resubmit. The entry is not
            deleted — it stays in the rejected tab for the record.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
              Reason *
            </label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Serial number does not match the book / total is wrong"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 font-bold uppercase" onClick={() => setRejectTargets([])}>
              Cancel
            </Button>
            <Button
              className="flex-[2] font-semibold uppercase bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectNote.trim() || busy}
              onClick={async () => {
                await runReview(rejectTargets, false, rejectNote.trim());
                setRejectTargets([]);
              }}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Void dialog */}
      <Modal
        isOpen={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        title="Void Manual Entry"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-700 dark:text-red-300">
              This restores stock and marks the entry voided. The row is never deleted
              and the BIR serial stays permanently consumed.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">
              {voidTarget?.manual_ref || 'No BIR serial'}{' '}
              <span className="text-muted-foreground font-normal">
                — {formatPrice(Number(voidTarget?.computed_total || 0))}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
              Reason *
            </label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate of serial 0001-12340"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 font-bold uppercase" onClick={() => setVoidTarget(null)}>
              Cancel
            </Button>
            <Button
              className="flex-[2] font-semibold uppercase bg-red-600 hover:bg-red-700 text-white"
              disabled={!voidReason.trim() || busy}
              onClick={handleVoid}
            >
              Void Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RequestCard({
  request,
  selected,
  expanded,
  busy,
  onToggleSelect,
  onToggleExpand,
  onApprove,
  onReject,
  onVoid,
}: {
  request: ManualEntryRequest;
  selected: boolean;
  expanded: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onVoid: () => void;
}) {
  const { formatPrice } = useCurrency();
  const isPending = request.status === 'pending';

  const statusBadge =
    isPending
      ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
      : request.status === 'approved'
      ? 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : 'text-muted-foreground border-border bg-muted';

  return (
    <Card className="rounded-lg border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {isPending && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1 accent-primary shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-base">{request.manual_ref || 'No BIR serial'}</span>
              <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${statusBadge}`}>
                {request.status}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {new Date(request.transaction_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
              {request.sold_by ? ` · sold by ${request.sold_by}` : ''}
              {' · '}
              {request.payment_method?.toUpperCase()}
            </p>

            <p className="text-xs text-muted-foreground mt-0.5">
              Keyed in by {request.source_cashier_name || 'Unknown'} ·{' '}
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums">
              {formatPrice(Number(request.computed_total || 0))}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {request.items?.length || 0} line{request.items?.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Hide details' : 'Review details'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-4 border-t border-border pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1 font-semibold uppercase text-[10px]">Description</th>
                    <th className="text-center py-1 font-semibold uppercase text-[10px] w-12">Qty</th>
                    <th className="text-right py-1 font-semibold uppercase text-[10px]">Price</th>
                    <th className="text-right py-1 font-semibold uppercase text-[10px]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(request.items || []).map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 font-semibold">
                        {item.description}
                        {!item.product_id && (
                          <span className="ml-1.5 text-[9px] font-semibold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            free text
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-semibold tabular-nums">{item.quantity}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        {formatPrice(Number(item.price || 0))}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {request.buyer_tin && (
                <div>
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Buyer TIN</p>
                  <p className="font-mono font-semibold">{request.buyer_tin}</p>
                </div>
              )}
              {request.buyer_address && (
                <div className="col-span-2">
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Buyer Address</p>
                  <p className="font-semibold">{request.buyer_address}</p>
                </div>
              )}
              {request.reference_number && (
                <div>
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Reference</p>
                  <p className="font-mono font-semibold">{request.reference_number}</p>
                </div>
              )}
              {request.term_due_date && (
                <div>
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Due Date</p>
                  <p className="font-semibold">{request.term_due_date}</p>
                </div>
              )}
              {request.amount_received != null && (
                <div>
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Tendered</p>
                  <p className="font-semibold tabular-nums">{formatPrice(Number(request.amount_received))}</p>
                </div>
              )}
              {request.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="font-semibold uppercase text-[10px] text-muted-foreground">Remarks</p>
                  <p className="font-semibold">{request.notes}</p>
                </div>
              )}
            </div>

            {request.review_note && (
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Admin Note</p>
                <p className="text-xs font-semibold">{request.review_note}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {isPending ? (
                <>
                  <Button
                    variant="outline"
                    onClick={onReject}
                    disabled={busy}
                    className="font-semibold uppercase text-xs"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    onClick={onApprove}
                    disabled={busy}
                    className="flex-1 font-semibold uppercase text-xs bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                </>
              ) : (
                request.status === 'approved' && (
                  <Button
                    variant="outline"
                    onClick={onVoid}
                    disabled={busy}
                    className="font-semibold uppercase text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Ban className="h-4 w-4 mr-1" /> Void Entry
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
