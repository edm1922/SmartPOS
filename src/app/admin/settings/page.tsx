'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Form, FormField, FormInput } from '@/components/ui/Form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define the settings schema for validation
const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeAddress: z.string().min(1, 'Store address is required'),
  storePhone: z.string().min(1, 'Store phone is required'),
  taxRate: z.number().min(0, 'Tax rate must be a positive number').max(100, 'Tax rate cannot exceed 100%'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: 'ACME Store',
      storeAddress: '123 Main Street, City, State 12345',
      storePhone: '(555) 123-4567',
      taxRate: 8.5,
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
    };

    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      // In a real app, you would save these settings to your database
      console.log('Saving settings:', data);
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-primary-600 w-8 h-8 rounded-full"></div>
                <span className="ml-2 text-xl font-bold text-gray-900">POS Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/admin/dashboard" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Products
                </a>
                <a href="/admin/cashiers" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Cashiers
                </a>
                <a href="/admin/reports" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Reports
                </a>
                <a href="/admin/settings" className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Settings
                </a>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <button
                onClick={handleSignOut}
                className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your store settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Settings Navigation */}
              <div className="lg:col-span-1">
                <Card>
                  <Card.Content className="p-0">
                    <nav className="space-y-1">
                      <a
                        href="#"
                        className="bg-primary-50 border-primary-500 text-primary-700 group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4"
                      >
                        <svg className="text-primary-500 group-hover:text-primary-500 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">General</span>
                      </a>
                      <a
                        href="#"
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4 border-transparent"
                      >
                        <svg className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="truncate">Security</span>
                      </a>
                      <a
                        href="#"
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4 border-transparent"
                      >
                        <svg className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="truncate">Notifications</span>
                      </a>
                      <a
                        href="#"
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4 border-transparent"
                      >
                        <svg className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        <span className="truncate">Receipts</span>
                      </a>
                    </nav>
                  </Card.Content>
                </Card>
              </div>

              {/* Settings Form */}
              <div className="lg:col-span-2">
                <Card>
                  <Card.Header>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">General Settings</h3>
                    <p className="mt-1 text-sm text-gray-500">Update your store information and preferences</p>
                  </Card.Header>
                  <Card.Content>
                    <Form form={form} onSubmit={onSubmit}>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField name="storeName" label="Store Name">
                          {({ field }) => <FormInput {...field} placeholder="Enter store name" />}
                        </FormField>
                        
                        <FormField name="storePhone" label="Store Phone">
                          {({ field }) => <FormInput {...field} placeholder="Enter phone number" />}
                        </FormField>
                        
                        <FormField name="taxRate" label="Tax Rate (%)">
                          {({ field }) => (
                            <FormInput 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          )}
                        </FormField>
                        
                        <FormField name="storeAddress" label="Store Address" className="sm:col-span-2">
                          {({ field }) => (
                            <textarea
                              {...field}
                              rows={3}
                              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              placeholder="Enter store address"
                            />
                          )}
                        </FormField>
                      </div>
                      
                      <div className="mt-6">
                        <Button type="submit" disabled={saving}>
                          {saving ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </div>
                    </Form>
                  </Card.Content>
                </Card>

                {/* Additional Settings Sections */}
                <Card className="mt-6">
                  <Card.Header>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Receipt Settings</h3>
                    <p className="mt-1 text-sm text-gray-500">Customize your receipt templates</p>
                  </Card.Header>
                  <Card.Content>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Show Store Logo</h4>
                          <p className="text-sm text-gray-500">Display your store logo on receipts</p>
                        </div>
                        <button
                          type="button"
                          className="bg-gray-200 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          role="switch"
                        >
                          <span
                            aria-hidden="true"
                            className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Show Customer Details</h4>
                          <p className="text-sm text-gray-500">Include customer information on receipts</p>
                        </div>
                        <button
                          type="button"
                          className="bg-gray-200 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          role="switch"
                        >
                          <span
                            aria-hidden="true"
                            className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                          />
                        </button>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}