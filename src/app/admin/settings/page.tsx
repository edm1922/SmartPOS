'use client';

import { useState, useEffect } from 'react';
import { supabaseDB } from '@/lib/supabaseClient';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeAddress: z.string().min(1, 'Store address is required'),
  storePhone: z.string().min(1, 'Store phone is required'),
  taxRate: z.number().min(0, 'Tax rate must be a positive number'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'receipts'>('general');

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { storeName: '', storeAddress: '', storePhone: '', taxRate: 0 },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabaseDB.getSettings();
      if (data) {
        form.reset({
          storeName: data.store_name || '',
          storeAddress: data.store_address || '',
          storePhone: data.store_phone || '',
          taxRate: data.tax_rate || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      const { error } = await supabaseDB.updateSettings({
        store_name: data.storeName,
        store_address: data.storeAddress,
        store_phone: data.storePhone,
        tax_rate: data.taxRate,
      });
      if (error) throw new Error(error);
      alert('Settings saved successfully!');
    } catch (error: any) {
      alert('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <Button
            variant={activeTab === 'general' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('general')}
          >
            General
          </Button>
          <Button
            variant={activeTab === 'receipts' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab('receipts')}
          >
            Receipts
          </Button>
        </div>
        <div className="lg:col-span-3">
          {activeTab === 'general' ? (
            <Card>
              <CardHeader><h3 className="text-lg font-medium">General Settings</h3></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField name="storeName" render={({ field }) => (
                      <div className="space-y-1"><Label>Store Name</Label><Input {...field} /></div>
                    )} />
                    <FormField name="storePhone" render={({ field }) => (
                      <div className="space-y-1"><Label>Phone</Label><Input {...field} /></div>
                    )} />
                    <FormField name="taxRate" render={({ field }) => (
                      <div className="space-y-1"><Label>Tax Rate (%)</Label>
                        <Input {...field} type="number" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </div>
                    )} />
                    <FormField name="storeAddress" render={({ field }) => (
                      <div className="space-y-1"><Label>Address</Label>
                        <textarea {...field} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                    )} />
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><h3 className="text-lg font-medium">Receipt Settings</h3></CardHeader>
              <CardContent><p className="text-sm text-gray-500">Coming soon...</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
