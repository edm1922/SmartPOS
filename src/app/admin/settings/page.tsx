'use client';

import { useState, useEffect } from 'react';
import { supabaseDB } from '@/lib/supabaseClient';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrency } from '@/context/CurrencyContext';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  FileText,
  Store,
  Save,
  ChevronRight,
  Printer,
  Info
} from 'lucide-react';

const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeAddress: z.string().min(1, 'Store address is required'),
  storePhone: z.string().min(1, 'Store phone is required'),
  taxRate: z.number().min(0, 'Tax rate must be a positive number'),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  showTaxOnReceipt: z.boolean().default(true),
  showAddressOnReceipt: z.boolean().default(true),
  showPhoneOnReceipt: z.boolean().default(true),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'receipts'>('general');

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: '',
      storeAddress: '',
      storePhone: '',
      taxRate: 0,
      receiptHeader: '',
      receiptFooter: '',
      showTaxOnReceipt: true,
      showAddressOnReceipt: true,
      showPhoneOnReceipt: true,
    },
  });

  const watchedValues = useWatch({
    control: form.control,
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
          receiptHeader: data.receipt_header || '',
          receiptFooter: data.receipt_footer || '',
          showTaxOnReceipt: data.show_tax_on_receipt ?? true,
          showAddressOnReceipt: data.show_address_on_receipt ?? true,
          showPhoneOnReceipt: data.show_phone_on_receipt ?? true,
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
        receipt_header: data.receiptHeader,
        receipt_footer: data.receiptFooter,
        show_tax_on_receipt: data.showTaxOnReceipt,
        show_address_on_receipt: data.showAddressOnReceipt,
        show_phone_on_receipt: data.showPhoneOnReceipt,
      });
      if (error) throw new Error(error);
      alert('Settings saved successfully!');
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your store identity, tax rates, and receipt appearance.
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={saving}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </span>
          )}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-1/4 space-y-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'general'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600'
              }`}
          >
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5" />
              <span className="font-medium">General Store</span>
            </div>
            {activeTab === 'general' && <ChevronRight className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'receipts'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600'
              }`}
          >
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5" />
              <span className="font-medium">Receipt Design</span>
            </div>
            {activeTab === 'receipts' && <ChevronRight className="h-4 w-4" />}
          </button>

          <Card className="mt-8 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">Quick Info</span>
              </div>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                Settings updated here will reflect across all cashier terminals instantly.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:flex-1">
          <Form {...form}>
            <form className="space-y-6">
              {activeTab === 'general' ? (
                <Card className="border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-6 border-b bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-xl font-bold">General Business Settings</h3>
                    <p className="text-sm text-muted-foreground">Basic information about your establishment.</p>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField name="storeName" render={({ field }) => (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Store Name</Label>
                          <Input {...field} placeholder="e.g. SmartPOS Hub" className="rounded-lg border-gray-200" />
                        </div>
                      )} />
                      <FormField name="storePhone" render={({ field }) => (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Contact Phone</Label>
                          <Input {...field} placeholder="+63 XXX XXX XXXX" className="rounded-lg border-gray-200" />
                        </div>
                      )} />
                      <FormField name="taxRate" render={({ field }) => (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Standard Tax Rate (%)</Label>
                          <div className="relative">
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              className="rounded-lg border-gray-200 pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">%</span>
                          </div>
                        </div>
                      )} />
                    </div>
                    <FormField name="storeAddress" render={({ field }) => (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Physical Address</Label>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Complete business address..."
                          className="rounded-lg border-gray-200 resize-none"
                        />
                      </div>
                    )} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-6 border-b bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-xl font-bold">Receipt Customization</h3>
                    <p className="text-sm text-muted-foreground">Modify how your printed and digital receipts appear.</p>
                  </div>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <FormField name="receiptHeader" render={({ field }) => (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Receipt Header text</Label>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="e.g. Welcome to our store!"
                              className="rounded-lg border-gray-200 resize-none text-[13px] font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground italic">Appears at the very top of the receipt.</p>
                          </div>
                        )} />

                        <FormField name="receiptFooter" render={({ field }) => (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Receipt Footer text</Label>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="e.g. No return, No exchange"
                              className="rounded-lg border-gray-200 resize-none text-[13px] font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground italic">Appears at the very bottom of the receipt.</p>
                          </div>
                        )} />
                      </div>

                      <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Visibility Toggles</h4>

                        <FormField name="showTaxOnReceipt" render={({ field }) => (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 text-xs font-bold font-mono">%</div>
                              <span className="text-sm font-medium">Show Tax Details</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                        )} />

                        <FormField name="showAddressOnReceipt" render={({ field }) => (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Store className="h-4 w-4" /></div>
                              <span className="text-sm font-medium">Show Store Address</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                        )} />

                        <FormField name="showPhoneOnReceipt" render={({ field }) => (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">📞</div>
                              <span className="text-sm font-medium">Show Phone Number</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                        )} />

                        <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 shadow-sm overflow-hidden relative">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-bl">PREVIEW</div>

                          {/* Receipt Content */}
                          <div className="text-center font-mono text-[10px] text-gray-900 dark:text-gray-100 space-y-1">
                            <h5 className="font-bold text-sm uppercase">{watchedValues.storeName || 'STORE NAME'}</h5>
                            {watchedValues.showAddressOnReceipt && (
                              <p className="opacity-70 leading-tight">{watchedValues.storeAddress || '123 Business St, City'}</p>
                            )}
                            {watchedValues.showPhoneOnReceipt && (
                              <p className="opacity-70">TEL: {watchedValues.storePhone || '555-1234'}</p>
                            )}

                            {watchedValues.receiptHeader && (
                              <div className="py-2 border-t border-dashed border-gray-200 dark:border-gray-700 mt-2 italic whitespace-pre-wrap">
                                {watchedValues.receiptHeader}
                              </div>
                            )}

                            <div className="border-y border-dashed border-gray-200 dark:border-gray-700 py-2 my-2 flex flex-col gap-1 text-left">
                              <div className="flex justify-between">
                                <span>DATE: {new Date().toLocaleDateString()}</span>
                                <span>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>OR#: 000123</span>
                                <span>CASHIER: ADMIN</span>
                              </div>
                            </div>

                            <div className="space-y-1 text-left">
                              <div className="flex justify-between">
                                <span>SAMPLE PRODUCT A</span>
                                <span>{formatPrice(100)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>SAMPLE PRODUCT B</span>
                                <span>{formatPrice(50)}</span>
                              </div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-2 mt-2 space-y-1">
                              <div className="flex justify-between">
                                <span>SUBTOTAL</span>
                                <span>{formatPrice(150)}</span>
                              </div>
                              {watchedValues.showTaxOnReceipt && (
                                <div className="flex justify-between text-gray-500">
                                  <span>TAX ({watchedValues.taxRate || 0}%)</span>
                                  <span>{formatPrice(150 * (watchedValues.taxRate || 0) / 100)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
                                <span>TOTAL</span>
                                <span>{formatPrice(150 + (watchedValues.showTaxOnReceipt ? (150 * (watchedValues.taxRate || 0) / 100) : 0))}</span>
                              </div>
                            </div>

                            {watchedValues.receiptFooter && (
                              <div className="pt-4 mt-2 border-t border-dashed border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                                {watchedValues.receiptFooter}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
