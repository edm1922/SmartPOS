'use client';

import * as bcrypt from 'bcryptjs';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';

const cashierSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().optional(),
    email: z.string().email('Invalid email address').or(z.literal('')).optional(),
});

type CashierFormData = z.infer<typeof cashierSchema>;

interface CreatedCashier {
    id: string;
    username: string;
    password: string;
    email: string | null;
}

interface AddCashierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCashierAdded: () => void;
}

const generateRandomPassword = (length: number = 12): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
};

export function AddCashierModal({ isOpen, onClose, onCashierAdded }: AddCashierModalProps) {
    const form = useForm<CashierFormData>({
        resolver: zodResolver(cashierSchema),
        defaultValues: {
            username: '',
        },
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [createdCashier, setCreatedCashier] = useState<CreatedCashier | null>(null);

    const onSubmit = async (data: CashierFormData) => {
        setLoading(true);
        setError(null);
        setCreatedCashier(null);

        try {
            const password = data.password || generateRandomPassword();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const { data: cashierData, error: dbError } = await supabase
                .from('cashiers')
                .insert({
                    username: data.username,
                    password: hashedPassword,
                    email: data.email || null,
                })
                .select()
                .single();

            if (dbError) throw new Error(`Database error: ${dbError.message}`);

            setCreatedCashier({
                id: cashierData.id,
                username: cashierData.username,
                password: password,
                email: cashierData.email
            });

            onCashierAdded();
        } catch (error: any) {
            console.error('Error creating cashier:', error);
            setError(error.message || 'Failed to create cashier. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadPassword = () => {
        if (!createdCashier) return;
        const content = `Cashier Account Details\nUsername: ${createdCashier.username}\nPassword: ${createdCashier.password}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashier-${createdCashier.username}-credentials.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setCreatedCashier(null);
            setError(null);
            form.reset();
        }, 300);
    };

    if (createdCashier) {
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title="Success" size="md">
                <div className="space-y-4">
                    <p className="text-green-600 font-medium">Cashier created successfully!</p>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                        <p><strong>Username:</strong> {createdCashier.username}</p>
                        <p><strong>Password:</strong> <code className="bg-gray-200 px-1">{createdCashier.password}</code></p>
                    </div>
                    <Button onClick={downloadPassword} className="w-full">Download Credentials</Button>
                    <Button onClick={handleClose} variant="outline" className="w-full">Close</Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Cashier" size="md">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <FormField
                        name="username"
                        render={({ field }) => (
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input {...field} id="username" placeholder="Enter username" />
                            </div>
                        )}
                    />
                    <FormField
                        name="email"
                        render={({ field }) => (
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (Optional)</Label>
                                <Input {...field} id="email" type="email" placeholder="Enter email" />
                            </div>
                        )}
                    />
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={handleClose} type="button">Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Cashier'}</Button>
                    </div>
                </form>
            </Form>
        </Modal>
    );
}
