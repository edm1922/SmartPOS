'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabaseDB } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { Form, FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/Button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { lookupProductByBarcode, isValidBarcode } from '@/lib/barcodeLookup';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';

const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be a positive number'),
    category: z.string().optional(),
    stock_quantity: z.number().min(0, 'Stock quantity must be a positive number'),
    barcode: z.string().optional(),
    image_url: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    stock_quantity: number;
    barcode?: string;
    image_url?: string;
    created_at: string;
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSave: () => void;
    setError: (error: string | null) => void;
    user?: any;
}

const generateBarcode = () => {
    return Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
};

export function ProductModal({ isOpen, onClose, product, onSave, setError, user }: ProductModalProps) {
    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            category: '',
            stock_quantity: 0,
            barcode: '',
            image_url: '',
        },
    });

    const { reset } = form;
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                description: product.description || '',
                price: product.price,
                category: product.category || '',
                stock_quantity: product.stock_quantity,
                barcode: product.barcode || '',
                image_url: product.image_url || '',
            });
            setPreviewUrl(product.image_url || null);
        } else {
            reset({
                name: '',
                description: '',
                price: 0,
                category: '',
                stock_quantity: 0,
                barcode: '',
                image_url: '',
            });
            setPreviewUrl(null);
        }
    }, [product, reset]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }
                if (e.key !== 'Escape') {
                    barcodeInputRef.current.focus();
                }
            }

            if (e.key === 'Enter' && e.target === barcodeInputRef.current) {
                const barcode = (e.target as HTMLInputElement).value;
                if (barcode) {
                    handleBarcodeLookup(barcode);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleBarcodeLookup = async (barcode: string) => {
        if (!isValidBarcode(barcode)) {
            setLookupError('Invalid barcode format');
            return;
        }

        setIsLookingUp(true);
        setLookupError(null);

        try {
            const productInfo = await lookupProductByBarcode(barcode);
            if (productInfo) {
                form.setValue('name', productInfo.name);
                form.setValue('description', productInfo.description || '');
                form.setValue('category', productInfo.category || '');
                form.setValue('price', productInfo.price || 0);
                form.setValue('barcode', barcode);
                setLookupError(`Product found: ${productInfo.name}`);
            } else {
                form.setValue('barcode', barcode);
                setLookupError('Product not found in database. You can manually enter product details.');
            }
        } catch (error) {
            console.error('Error looking up barcode:', error);
            setLookupError('Error looking up barcode. Please try again.');
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            setError('File size too large. Maximum is 5MB.');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Unsupported file type. Please use JPG, PNG or WebP.');
            return;
        }

        // Preview locally
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        setIsUploading(true);
        try {
            const { publicUrl, error: uploadError } = await supabaseDB.uploadProductImage(file);

            if (uploadError) {
                // Determine specific error message
                let userFriendlyError = uploadError;
                if (uploadError.includes('bucket_not_found')) {
                    userFriendlyError = 'Storage bucket "products" not found. Please create it in your Supabase dashboard.';
                } else if (uploadError.includes('Permission denied') || uploadError.includes('new row violates row-level security')) {
                    userFriendlyError = 'Permission denied. Please check your Storage RLS policies for the "products" bucket.';
                }
                throw new Error(userFriendlyError);
            }

            form.setValue('image_url', publicUrl || '');
        } catch (error: any) {
            console.error('File upload error:', error);
            setError(error.message || 'Failed to upload image. Please check your Supabase Storage settings.');
            setPreviewUrl(null); // Clear preview on actual failure to keep form state consistent
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        setPreviewUrl(null);
        form.setValue('image_url', '');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const onSubmit = async (data: ProductFormData) => {
        try {
            if (product) {
                const { error } = await supabaseDB.updateProduct(product.id, data);
                if (error) throw new Error(error);

                if (user) {
                    await supabaseDB.logActivity(
                        user.id,
                        'Product Updated',
                        `Updated product "${data.name}" (ID: ${product.id})`
                    );
                }
            } else {
                const { error } = await supabaseDB.addProduct(data);
                if (error) throw new Error(error);

                if (user) {
                    await supabaseDB.logActivity(
                        user.id,
                        'Product Added',
                        `Added new product "${data.name}"`
                    );
                }
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving product:', error);
            setError('Failed to save product. Please try again.');
        }
    };

    const handleGenerateBarcode = () => {
        form.setValue('barcode', generateBarcode());
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product ? 'Edit Product' : 'Add Product'}
            size="lg"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Image Upload Area */}
                    <div className="flex flex-col items-center justify-center space-y-4 pt-2">
                        <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mr-auto">Product Image</Label>
                        <div
                            className={`relative h-48 w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-gray-50/50 dark:bg-gray-900/50 ${previewUrl ? 'border-primary' : 'border-gray-200 dark:border-gray-800 hover:border-primary/50 cursor-pointer'}`}
                            onClick={() => !previewUrl && fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className={`h-full w-full object-contain ${isUploading ? 'opacity-40' : ''}`} />
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        </div>
                                    )}
                                    {!isUploading && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="text-center space-y-2 p-4">
                                    <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                        {isUploading ? <Loader2 className="h-6 w-6 text-primary animate-spin" /> : <Upload className="h-6 w-6 text-gray-400" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isUploading ? 'Uploading...' : 'Click to upload photo'}</p>
                                        <p className="text-[10px] text-gray-400">PNG, JPG or WebP (max 5MB)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <div className="space-y-2">
                                <Label htmlFor="barcodeScanner">Scan Barcode</Label>
                                <div className="flex space-x-2">
                                    <Input
                                        ref={barcodeInputRef}
                                        id="barcodeScanner"
                                        placeholder="Scan barcode or enter manually"
                                        className={lookupError ? (lookupError.includes('found') && !lookupError.includes('not found') ? 'border-green-500' : 'border-red-500') : ''}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const barcode = barcodeInputRef.current?.value;
                                            if (barcode) handleBarcodeLookup(barcode);
                                        }}
                                        variant="secondary"
                                        disabled={isLookingUp}
                                    >
                                        {isLookingUp ? 'Looking up...' : 'Lookup'}
                                    </Button>
                                </div>
                                {lookupError && (
                                    <p className={`text-sm ${lookupError.includes('found') && !lookupError.includes('not found') ? 'text-green-600' : 'text-red-600'}`}>
                                        {lookupError}
                                    </p>
                                )}
                            </div>
                        </div>

                        <FormField
                            name="name"
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input {...field} id="name" placeholder="Enter product name" />
                                </div>
                            )}
                        />

                        <FormField
                            name="category"
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRODUCT_CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category}>{category}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />

                        <FormField
                            name="price"
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price</Label>
                                    <Input
                                        {...field}
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            )}
                        />

                        <FormField
                            name="stock_quantity"
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                                    <Input
                                        {...field}
                                        id="stock_quantity"
                                        type="number"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            )}
                        />

                        <div className="sm:col-span-2">
                            <FormField
                                name="barcode"
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="barcode">Barcode</Label>
                                        <div className="flex space-x-2">
                                            <Input {...field} id="barcode" placeholder="Enter barcode or generate one" />
                                            <Button type="button" onClick={handleGenerateBarcode} variant="secondary">Generate</Button>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <FormField
                                name="description"
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea {...field} id="description" rows={4} placeholder="Enter product description" />
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">{product ? 'Update Product' : 'Add Product'}</Button>
                    </div>
                </form>
            </Form>
        </Modal>
    );
}
