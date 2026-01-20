'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { AddCashierModal } from '@/components/admin/AddCashierModal';

interface Cashier {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
}

export default function CashierManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from('cashiers')
        .select('id, username, email, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCashiers(data || []);
    } catch (error: any) {
      setError('Failed to load cashiers.');
    }
  };

  const handleDeleteCashier = async (cashierId: string) => {
    if (!confirm('Are you sure you want to delete this cashier?')) return;
    try {
      const { error } = await supabase.from('cashiers').delete().eq('id', cashierId);
      if (error) throw error;
      setCashiers(cashiers.filter(c => c.id !== cashierId));
    } catch (error: any) {
      setError('Failed to delete cashier.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cashier Management</h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 hover:bg-primary-700 text-white">
          Add Cashier
        </Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700">
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.map((cashier) => (
                <TableRow key={cashier.id} className="border-b border-gray-200 dark:border-gray-700">
                  <TableCell className="font-medium">{cashier.username}</TableCell>
                  <TableCell>{cashier.email || '-'}</TableCell>
                  <TableCell>{new Date(cashier.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleDeleteCashier(cashier.id)} variant="destructive" size="sm">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddCashierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCashierAdded={fetchCashiers}
      />
    </div>
  );
}
