import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCurrency } from '@/context/CurrencyContext';
import { Loader2, Printer, Calendar, Banknote, CreditCard, Wallet, FileText, CalendarDays, HandCoins } from 'lucide-react';

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('cashier_id', cashierId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
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
        
        let total = 0, cash = 0, card = 0, mobile = 0, term = 0;
        data.forEach(tx => {
          total += tx.total_amount;
          if (tx.payment_method === 'cash') cash += tx.total_amount;
          if (tx.payment_method === 'card') card += tx.total_amount;
          if (tx.payment_method === 'mobile') mobile += tx.total_amount;
          if (tx.payment_method === 'term') term += tx.total_amount;
        });

        setSummary({
          totalAmount: total,
          cashAmount: cash,
          cardAmount: card,
          mobileAmount: mobile,
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
                <h2 className="text-2xl font-black uppercase mb-1">EOD Report</h2>
                <p className="text-sm text-gray-500 font-bold">Operator: {cashierName || 'Unknown'}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-gray-50 border p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">Gross Sales</p>
                  <p className="text-lg font-black text-primary truncate mt-1">{formatPrice(summary.totalAmount)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-green-700 uppercase">Cash</p>
                  <p className="text-lg font-black text-green-700 truncate mt-1">{formatPrice(summary.cashAmount)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-blue-700 uppercase">Card</p>
                  <p className="text-lg font-black text-blue-700 truncate mt-1">{formatPrice(summary.cardAmount)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-orange-700 uppercase">Term</p>
                  <p className="text-lg font-black text-orange-700 truncate mt-1">{summary.termAmount > 0 ? formatPrice(summary.termAmount) : '₱0.00'}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-purple-700 uppercase">Term Payments Rec'd</p>
                  <p className="text-lg font-black text-purple-700 truncate mt-1">{summary.termPaymentsReceived > 0 ? formatPrice(summary.termPaymentsReceived) : '₱0.00'}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center">
                  <p className="text-xs font-bold text-purple-700 uppercase">Trans (Total)</p>
                  <p className="text-xl font-black text-purple-700 mt-1">{summary.transactionCount}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-3 border-b pb-1">Today's Transactions</h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-center text-gray-400 py-4 italic">No transactions processed today.</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Time</th>
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">Method</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b">
                            <td className="px-4 py-2 text-gray-500">{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                            <td className="px-4 py-2 font-mono text-xs">{tx.id.substring(0, 8)}</td>
                            <td className="px-4 py-2 uppercase text-[10px] font-bold">{tx.payment_method}</td>
                            <td className="px-4 py-2 text-right font-bold text-gray-900">{formatPrice(tx.total_amount)}</td>
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
              <Button onClick={handlePrint} className="flex-1 font-black uppercase flex items-center justify-center gap-2">
                <Printer className="h-4 w-4" /> Print Report
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
