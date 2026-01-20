'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

interface Transaction {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  cashier?: { email: string };
}

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'today') startDate.setHours(0, 0, 0, 0);
    else if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
    else startDate.setMonth(now.getMonth() - 1);

    const { data } = await supabase
      .from('transactions')
      .select('*, users(email)') // Assuming users table link
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    setTransactions((data || []).map(t => ({
      ...t,
      cashier: t.users ? { email: t.users.email } : undefined
    })));
  };

  const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <div className="flex space-x-2">
          {(['today', 'week', 'month'] as const).map(range => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold">₱{totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Avg. Transaction</p>
            <p className="text-2xl font-bold">
              ₱{transactions.length > 0 ? (totalSales / transactions.length).toFixed(2) : '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><h3 className="text-lg font-semibold">Recent Transactions</h3></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{t.cashier?.email || 'Unknown'}</TableCell>
                  <TableCell className="capitalize">{t.payment_method}</TableCell>
                  <TableCell className="text-right font-medium">₱{t.total_amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
