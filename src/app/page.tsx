'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ShieldCheck, Monitor, Store, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground w-9 h-9 rounded-lg flex items-center justify-center shadow-sm">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight">AJ Softdrive</span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                  POS Suite
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              {session && (
                <Button
                  onClick={() => supabase.auth.signOut()}
                  variant="outline"
                  size="sm"
                  className="font-semibold gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full space-y-6">
          {/* Title Banner */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              AJ Softdrive POS
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Select a portal below to access administration controls or cashier sales operations.
            </p>
          </div>

          {session ? (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Authenticated Session Active</p>
                  <p className="text-xs opacity-90">{session.user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Link href="/admin/dashboard" className="w-full">
                  <Button className="w-full font-semibold gap-2 h-11" variant="default">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                </Link>
                <Link href="/cashier/pos" className="w-full">
                  <Button className="w-full font-semibold gap-2 h-11" variant="outline">
                    <Monitor className="h-4 w-4" />
                    Cashier Terminal
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Admin Portal Card */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Admin Portal</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage inventory, approvals, cashier accounts, and financial reports.
                    </p>
                  </div>
                </div>
                <Link href="/auth/admin/login" className="w-full">
                  <Button className="w-full font-semibold gap-2 group" variant="default">
                    Admin Login
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>

              {/* Cashier Portal Card */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Cashier Terminal</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Process retail transactions, barcodes, customer credit, and BIR receipts.
                    </p>
                  </div>
                </div>
                <Link href="/auth/cashier/login" className="w-full">
                  <Button className="w-full font-semibold gap-2 group" variant="outline">
                    Cashier Login
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">AJ Softdrive Store</span>
            </div>
            <p>
              &copy; {new Date().getFullYear()} AJ Softdrive. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}