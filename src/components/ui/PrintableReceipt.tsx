import React, { useMemo } from 'react';

interface ReceiptItem {
    name: string;
    price: number;
    quantity: number;
}

interface ReceiptProps {
    transactionId: string;
    date: string;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    amountReceived?: number;
    change?: number;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    cashierName?: string;
    deliveredTo?: string;
    tin?: string;
    orNumber?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    taxRate?: number;
    showSignatures?: boolean;
}

export const PrintableReceipt: React.FC<ReceiptProps> = ({
    transactionId,
    date,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    amountReceived,
    change,
    storeName = 'AJ SOFTDRIVE',
    storeAddress = 'Lapu-Lapu Street Tacurong City, Sultan Kudarat',
    storePhone = '+63 912 345 6789',
    cashierName,
    deliveredTo,
    tin,
    orNumber,
    receiptHeader = 'welcome to AJSoftDrive',
    receiptFooter = 'Happy to serve you',
    taxRate = 12,
    showSignatures = true,
}) => {
    const formatCurrency = (amount: number) => amount.toFixed(2);

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return dateString;
        }
    };

    // Group identical items
    const groupedItems = useMemo(() => {
        const grouped = new Map<string, { name: string; quantity: number; total: number; price: number }>();
        items.forEach(item => {
            const key = item.name.toLowerCase().trim();
            const existing = grouped.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                existing.total += item.price * item.quantity;
            } else {
                grouped.set(key, {
                    name: item.name,
                    quantity: item.quantity,
                    total: item.price * item.quantity,
                    price: item.price
                });
            }
        });
        return Array.from(grouped.values());
    }, [items]);

    // Calculate available lines (66 total for 11" at 6 LPI)
    const TOTAL_LINES = 66;
    const SIGNATURE_LINES = 9;
    const FIXED_LINES = showSignatures ? 24 : (24 - SIGNATURE_LINES);
    const MAX_ITEMS = TOTAL_LINES - FIXED_LINES;

    const visibleItems = groupedItems.slice(0, MAX_ITEMS - 2);
    const remainingCount = groupedItems.length - visibleItems.length;
    const remainingTotal = groupedItems.slice(MAX_ITEMS - 2).reduce((sum, item) => sum + item.total, 0);

    // Column widths
    const COLUMNS = { ITEM: 38, QTY: 8, PRICE: 12, TOTAL: 12 };
    const TOTAL_WIDTH = COLUMNS.ITEM + COLUMNS.QTY + COLUMNS.PRICE + COLUMNS.TOTAL;

    const padRight = (str: string, width: number) => {
        str = String(str);
        return str.length > width ? str.substring(0, width - 3) + '...' : str + ' '.repeat(width - str.length);
    };

    const padLeft = (str: string, width: number) => {
        str = String(str);
        return str.length > width ? str.substring(0, width) : ' '.repeat(width - str.length) + str;
    };

    const buildReceipt = () => {
        const lines: string[] = [];

        // Header
        lines.push(storeName);
        lines.push(storeAddress);
        lines.push(`Tel: ${storePhone}`);
        lines.push(receiptHeader);

        // Transaction info - compressed
        lines.push(`INV:${transactionId.substring(0, 8)} DATE:${formatDate(date)}`);
        lines.push(`CSR:${cashierName || 'SYSTEM'} CUST:${deliveredTo || 'WALK-IN'}${tin ? ` TIN:${tin}` : ''}${orNumber ? ` OR:${orNumber}` : ''}`);

        // Items header
        lines.push(padRight('ITEM', COLUMNS.ITEM) + padLeft('QTY', COLUMNS.QTY) + padLeft('PRICE', COLUMNS.PRICE) + padLeft('TOTAL', COLUMNS.TOTAL));

        // Items
        visibleItems.forEach(item => {
            lines.push(
                padRight(item.name.substring(0, COLUMNS.ITEM), COLUMNS.ITEM) +
                padLeft(item.quantity.toString(), COLUMNS.QTY) +
                padLeft(formatCurrency(item.price), COLUMNS.PRICE) +
                padLeft(formatCurrency(item.total), COLUMNS.TOTAL)
            );
        });

        // Summary if needed
        if (remainingCount > 0) {
            lines.push(padRight(`+${remainingCount} items`, COLUMNS.ITEM + COLUMNS.QTY + COLUMNS.PRICE) + padLeft(formatCurrency(remainingTotal), COLUMNS.TOTAL));
        }

        // VAT Calculation based on formula:
        // VAT Amount = Net Price (subtotal) × (VAT Rate ÷ 100)
        // Final Price (Gross) = Net Price + VAT Amount
        const vatAmount = subtotal * (taxRate / 100);
        const finalPrice = subtotal + vatAmount;

        // Totals
        lines.push(' '.repeat(TOTAL_WIDTH - 20) + `SUBTOTAL ${formatCurrency(subtotal)}`);
        lines.push(' '.repeat(TOTAL_WIDTH - 20) + `VAT (${taxRate}%) ${formatCurrency(vatAmount)}`);
        lines.push(' '.repeat(TOTAL_WIDTH - 15) + `TOTAL ${formatCurrency(finalPrice)}`);

        // Payment
        lines.push(`PMT:${paymentMethod.toUpperCase()} ${amountReceived ? `CASH:${formatCurrency(amountReceived)}` : ''} ${change ? `CHG:${formatCurrency(change)}` : ''}`);

        // Footer
        lines.push(receiptFooter);

        if (showSignatures) {
            // Add empty line before signatures
            lines.push('');

            // Signature lines
            const signatureWidth = 35;
            const signatureLine = '_'.repeat(signatureWidth);

            // Cashier signature
            lines.push('Cashier Signature:');
            lines.push(signatureLine);
            lines.push(cashierName ? `Printed Name: ${cashierName}` : '');

            // Add space between signatures
            lines.push('');

            // Customer signature
            lines.push('Customer Signature:');
            lines.push(signatureLine);
            lines.push(deliveredTo ? `Printed Name: ${deliveredTo}` : '');

            // Add small space before powered by
            lines.push('');
        }
        lines.push('Powered by SmartPOS');

        return lines.join('\n');
    };

    return (
        <div style={{
            width: '9.5in',
            height: '11in',
            margin: 0,
            padding: '0.2in',
            background: 'white',
            fontFamily: 'Courier New, monospace',
            fontSize: '12pt',
            lineHeight: '1.2',
            whiteSpace: 'pre',
            overflow: 'hidden'
        }}>
            <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>{buildReceipt()}</pre>
        </div>
    );
};