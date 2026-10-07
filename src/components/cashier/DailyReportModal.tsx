import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCurrency } from '@/context/CurrencyContext';
import { Loader2, Printer } from 'lucide-react';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierId: string | null;
  cashierName: string | null;
}

export function DailyReportModal({ isOpen, onClose, cashierId, cashierName }: DailyReportModalProps) {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    cashAmount: 0,
    cardAmount: 0,
    mobileAmount: 0,
    chequeAmount: 0,
    termAmount: 0,
    termPaymentsReceived: 0,
    transactionCount: 0
  });

  useEffect(() => {
    if (isOpen && cashierId) {
      fetchDailyData();
    }
  }, [isOpen, cashierId]);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // transaction_date is the date of record (the BIR receipt date for manual
      // entries, the sale day for register rows), matching the admin Reports
      // page. Built from local time so a late-evening sale is not pushed into
      // the next day by a UTC conversion.
      const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        // Approved manual BIR entries deliberately carry cashier_id = NULL and
        // are attributed through recorded_by_cashier_id, so both columns must be
        // matched or the cashier's own manual sales would be missing from their
        // gross sales. Voided rows are excluded so a voided entry cannot inflate
        // the totals.
        .eq('transaction_date', todayDate)
        .or(`cashier_id.eq.${cashierId},recorded_by_cashier_id.eq.${cashierId}`)
        .is('voided_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let termPaymentsTotal = 0;
      const { data: termPayments, error: termErr } = await supabase
        .from('term_payments')
        .select('amount')
        .eq('cashier_id', cashierId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());
      if (!termErr && termPayments) {
        termPaymentsTotal = termPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      }

      if (data) {
        setTransactions(data);
        
        let total = 0, cash = 0, card = 0, mobile = 0, cheque = 0, term = 0;
        data.forEach(tx => {
          const amt = Number(tx.total_amount || 0);
          if (tx.payment_method === 'term') {
            // Unpaid term principal is NOT gross sales. Only the down payment
            // collected at the time of sale counts here; later payments arrive
            // through the term_payments query above.
            total += Number(tx.down_payment || 0);
            term += amt;
          } else {
            total += amt;
            if (tx.payment_method === 'cash') cash += amt;
            if (tx.payment_method === 'card') card += amt;
            if (tx.payment_method === 'mobile') mobile += amt;
            if (tx.payment_method === 'cheque') cheque += amt;
          }
        });

        setSummary({
          totalAmount: total + termPaymentsTotal,
          cashAmount: cash,
          cardAmount: card,
          mobileAmount: mobile,
          chequeAmount: cheque,
          termAmount: term,
          termPaymentsReceived: termPaymentsTotal,
          transactionCount: data.length
        });
      }
    } catch (err) {
      console.error('Failed to fetch daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('daily-report-print-area');
    if (!printContent) return;
    
    // Simple popup print
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Daily Report</title>
            <style>
              body { font-family: monospace; padding: 20px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
              .text-right { text-align: right; }
              .header { text-align: center; margin-bottom: 20px; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cashier Daily Report" size="lg">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div id="daily-report-print-area">
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-lg font-bold uppercase mb-1">EOD Report</h2>
                <p className="text-sm text-muted-foreground font-bold">Operator: {cashierName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border border border-border rounded-lg mb-6">
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Gross Sales</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.totalAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Cash</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.cashAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Card</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.cardAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Mobile</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.mobileAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Cheque</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.chequeAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Term</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.termAmount)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Term Payments Rec'd</p>
                  <p className="text-lg font-bold text-foreground tabular-nums truncate mt-1">{formatPrice(summary.termPaymentsReceived)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Trans (Total)</p>
                  <p className="text-xl font-bold text-foreground tabular-nums mt-1">{summary.transactionCount}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">Today's Transactions</h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No transactions processed today.</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] text-muted-foreground uppercase bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Time</th>
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Method</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b">
                            <td className="px-4 py-2 text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {tx.id.substring(0, 8)}
                              {tx.source === 'manual' && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  Manual{tx.manual_ref ? ` · ${tx.manual_ref}` : ''}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 uppercase text-[10px] font-bold">{tx.payment_method}</td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums">{formatPrice(tx.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t mt-6">
              <Button onClick={onClose} variant="ghost" className="flex-1 font-bold uppercase">Close</Button>
              <Button onClick={handlePrint} className="flex-1 font-bold uppercase flex items-center justify-center gap-2">
                <Printer className="h-4 w-4" /> Print Report
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
