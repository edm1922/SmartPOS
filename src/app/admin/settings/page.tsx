'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { supabaseDB } from '@/lib/supabaseClient';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AVAILABLE_CURRENCIES } from '@/context/CurrencyContext';

// Define the settings schema for validation
const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeAddress: z.string().min(1, 'Store address is required'),
  storePhone: z.string().min(1, 'Store phone is required'),
  taxRate: z.number().min(0, 'Tax rate must be a positive number').max(100, 'Tax rate cannot exceed 100%'),
  // currency field removed - PHP is now the default and only currency
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
  // currency field removed - PHP is now the default and only currency
}

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'receipts'>('general');
  const [showStoreLogo, setShowStoreLogo] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const router = useRouter();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: '',
      storeAddress: '',
      storePhone: '',
      taxRate: 0,
    },
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/admin/login');
        return;
      }

      setUser(session.user);
      setLoading(false);
      fetchSettings();
    };

    checkUser();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabaseDB.getSettings();
      
      if (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings. Please try again.');
        return;
      }
      
      if (data) {
        form.reset({
          storeName: data.store_name || '',
          storeAddress: data.store_address || '',
          storePhone: data.store_phone || '',
          taxRate: data.tax_rate || 0,
        });
      }
      
      // Load currency from localStorage if available
      const savedCurrency = localStorage.getItem('pos_currency');
      if (savedCurrency) {
        try {
          const parsed = JSON.parse(savedCurrency);
          // Currency is now fixed to PHP, so we don't need to set it in the form
          console.log('Currency is now fixed to PHP, ignoring saved currency:', parsed.code);
        } catch (e) {
          console.error('Failed to parse saved currency', e);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Error loading settings. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    setError(null);
    
    try {
      // Save settings to database
      const settingsData = {
        store_name: data.storeName,
        store_address: data.storeAddress,
        store_phone: data.storePhone,
        tax_rate: data.taxRate,
      };
      
      const { error: saveError } = await supabaseDB.updateSettings(settingsData);
      
      if (saveError) {
        throw new Error(saveError);
      }
      
      // Save currency to localStorage (fixed to PHP)
      const phpCurrency = AVAILABLE_CURRENCIES.find(c => c.code === 'PHP');
      if (phpCurrency) {
        localStorage.setItem('pos_currency', JSON.stringify(phpCurrency));
      }
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">POS Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/admin/dashboard" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="/admin/reports" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
                </a>
                <a href="/admin/settings" className="border-primary-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Settings
                </a>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="sm"
                className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your store settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Settings Navigation */}
              <div className="lg:col-span-1">
                <Card className="bg-white dark:bg-gray-800">
                  <CardContent className="p-0">
                    <nav className="space-y-1">
                      <a
                        href="#"
                        className={`${
                          activeTab === 'general' 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                        } group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('general');
                        }}
                      >
                        <svg className="text-primary-500 dark:text-primary-400 group-hover:text-primary-500 dark:group-hover:text-primary-300 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">General</span>
                      </a>
                      <a
                        href="#"
                        className={`${
                          activeTab === 'receipts' 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                        } group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('receipts');
                        }}
                      >
                        <svg className="text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        <span className="truncate">Receipts</span>
                      </a>
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Form */}
              <div className="lg:col-span-2">
                {activeTab === 'general' ? (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">General Settings</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update your store information and preferences</p>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <FormField
                              name="storeName"
                              render={({ field }) => (
                                <div className="space-y-2">
                                  <Label htmlFor="storeName" className="text-gray-900 dark:text-white">Store Name</Label>
                                  <Input 
                                    {...field} 
                                    id="storeName"
                                    placeholder="Enter store name" 
                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                  />
                                </div>
                              )}
                            />
                            
                            <FormField
                              name="storePhone"
                              render={({ field }) => (
                                <div className="space-y-2">
                                  <Label htmlFor="storePhone" className="text-gray-900 dark:text-white">Store Phone</Label>
                                  <Input 
                                    {...field} 
                                    id="storePhone"
                                    placeholder="Enter phone number" 
                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                  />
                                </div>
                              )}
                            />
                            
                            <FormField
                              name="taxRate"
                              render={({ field }) => (
                                <div className="space-y-2">
                                  <Label htmlFor="taxRate" className="text-gray-900 dark:text-white">Tax Rate (%)</Label>
                                  <Input 
                                    {...field} 
                                    id="taxRate"
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                  />
                                </div>
                              )}
                            />
                            
                            <FormField
                              name="storeAddress"
                              render={({ field }) => (
                                <div className="space-y-2 sm:col-span-2">
                                  <Label htmlFor="storeAddress" className="text-gray-900 dark:text-white">Store Address</Label>
                                  <textarea
                                    {...field}
                                    id="storeAddress"
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                                    placeholder="Enter store address"
                                  />
                                </div>
                              )}
                            />
                          </div>
                          
                          <div className="mt-6">
                            <Button 
                              type="submit" 
                              disabled={saving}
                              className="bg-primary-600 hover:bg-primary-700 text-white"
                            >
                              {saving ? 'Saving...' : 'Save Settings'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Receipt Settings</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Customize your receipt templates</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Store Logo</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Display your store logo on receipts</p>
                          </div>
                          <button
                            type="button"
                            className={`${
                              showStoreLogo 
                                ? 'bg-primary-600' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                            role="switch"
                            onClick={() => setShowStoreLogo(!showStoreLogo)}
                          >
                            <span
                              aria-hidden="true"
                              className={`${
                                showStoreLogo 
                                  ? 'translate-x-5' 
                                  : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Customer Details</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Include customer information on receipts</p>
                          </div>
                          <button
                            type="button"
                            className={`${
                              showCustomerDetails 
                                ? 'bg-primary-600' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                            role="switch"
                            onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                          >
                            <span
                              aria-hidden="true"
                              className={`${
                                showCustomerDetails 
                                  ? 'translate-x-5' 
                                  : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                            />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}