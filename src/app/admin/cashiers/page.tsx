'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus,
  Search,
  Trash2,
  Users,
  ShieldCheck,
  Mail,
  Calendar,
  UserCircle,
  AlertCircle
} from 'lucide-react';

interface Cashier {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  is_active?: boolean;
}

export default function CashierManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cashiers')
        .select('id, username, email, created_at, is_active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCashiers(data || []);
    } catch (error: any) {
      console.error('Error fetching cashiers:', error);
      setError('Failed to load cashiers.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCashier = async (cashierId: string) => {
    if (!confirm('Are you sure you want to delete this cashier account? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('cashiers').delete().eq('id', cashierId);
      if (error) throw error;
      setCashiers(cashiers.filter(c => c.id !== cashierId));
    } catch (error: any) {
      setError('Failed to delete cashier.');
    }
  };

  const filteredCashiers = useMemo(() => {
    return cashiers.filter(cashier =>
      cashier.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cashiers, searchTerm]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Cashier Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your store staff, access permissions, and account status.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 px-6">
          <UserPlus className="h-4 w-4" /> Add Cashier
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search staff by username or email..."
          className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-primary h-11 rounded-xl shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <Badge variant="destructive" className="w-full py-2 flex items-center h-auto justify-center gap-2 rounded-xl">
          <AlertCircle className="h-4 w-4" /> {error}
        </Badge>
      )}

      {/* Cashiers Table */}
      <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b">
                <TableRow>
                  <TableHead className="w-[300px]">Staff Member</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-12 w-full rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-40 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 ml-auto rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCashiers.length > 0 ? (
                  filteredCashiers.map((cashier) => (
                    <TableRow key={cashier.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <UserCircle className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-none">{cashier.username}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tight">UID: {cashier.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1.5 px-3">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="h-3.5 w-3.5 opacity-50" />
                          {cashier.email || 'No email provided'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-3.5 w-3.5 opacity-50" />
                          {new Date(cashier.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleDeleteCashier(cashier.id)}
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-red-500 hover:text-red-700 hover:border-red-500/50 shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">No cashiers found</p>
                          <p className="text-sm text-muted-foreground">Search results or staff list is currently empty.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
