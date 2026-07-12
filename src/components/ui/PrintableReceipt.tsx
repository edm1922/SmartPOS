import React, { useMemo } from 'react';

interface ReceiptItem {
    name: string;
    price: number;
    quantity: number;
}

interface TermAllocation {
    transactionId: string;
    amount: number;
}

interface ReceiptProps {
    transactionId: string;
    date: string;
    items?: ReceiptItem[];
    subtotal?: number;
    tax?: number;
    total: number;
    originalTotal?: number;
    discountPercent?: number;
    discountAmount?: number;
    paymentMethod: string;
    referenceNumber?: string;
    amountReceived?: number;
    change?: number;
    downPayment?: number;
    remainingBalance?: number;
    dueDate?: string;
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
    termPaymentMode?: boolean;
    customerName?: string;
    allocations?: TermAllocation[];
    notes?: string;
}

export const PrintableReceipt: React.FC<ReceiptProps> = ({
    transactionId,
    date,
    items = [],
    subtotal = 0,
    tax = 0,
    total,
    originalTotal,
    discountPercent,
    discountAmount,
    paymentMethod,
    referenceNumber,
    amountReceived,
    change,
    downPayment,
    remainingBalance,
    dueDate,
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
    termPaymentMode,
    customerName,
    allocations,
    notes,
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

    const TERM_WIDTH = 50;
    const SALE_COLUMNS = { ITEM: 38, QTY: 8, PRICE: 12, TOTAL: 12 };
    const SALE_WIDTH = SALE_COLUMNS.ITEM + SALE_COLUMNS.QTY + SALE_COLUMNS.PRICE + SALE_COLUMNS.TOTAL;

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
        const totalWidth = termPaymentMode ? TERM_WIDTH : SALE_WIDTH;

        // Header
        lines.push(storeName);
        lines.push(storeAddress);
        lines.push(`Tel: ${storePhone}`);
        if (!termPaymentMode) lines.push(receiptHeader);

        if (termPaymentMode) {
            lines.push('TERM PAYMENT RECEIPT');
            lines.push(`REF:${transactionId.substring(0, 8).toUpperCase()} DATE:${formatDate(date)}`);
            lines.push(`CSR:${cashierName || 'SYSTEM'} CUST:${customerName || 'N/A'}`);
            lines.push('-'.repeat(totalWidth));
            lines.push(padRight('Amount Paid', totalWidth - 12) + padLeft(formatCurrency(total), 12));
            lines.push(`PMT:${paymentMethod.toUpperCase()}`);
            if (referenceNumber) lines.push(`REF:${referenceNumber}`);
            if (notes) lines.push(`NOTES:${notes}`);
            lines.push('-'.repeat(totalWidth));
            lines.push('ALLOCATIONS');
            (allocations || []).forEach(a => {
                lines.push(
                    `  #${a.transactionId.substring(0, 8)}` +
                    padLeft(formatCurrency(a.amount), totalWidth - 22)
                );
            });
            lines.push('-'.repeat(totalWidth));
            lines.push(padRight('Remaining Balance', totalWidth - 12) + padLeft(formatCurrency(remainingBalance || 0), 12));
            lines.push('-'.repeat(totalWidth));
        } else {
            // Transaction info - compressed
            lines.push(`INV:${transactionId.substring(0, 8)} DATE:${formatDate(date)}`);
            lines.push(`CSR:${cashierName || 'SYSTEM'} CUST:${deliveredTo || 'WALK-IN'}${tin ? ` TIN:${tin}` : ''}${orNumber ? ` Purchase Order:${orNumber}` : ''}`);

            // Items header
            lines.push(padRight('ITEM', SALE_COLUMNS.ITEM) + padLeft('QTY', SALE_COLUMNS.QTY) + padLeft('PRICE', SALE_COLUMNS.PRICE) + padLeft('TOTAL', SALE_COLUMNS.TOTAL));

            // Items
            visibleItems.forEach(item => {
                lines.push(
                    padRight(item.name.substring(0, SALE_COLUMNS.ITEM), SALE_COLUMNS.ITEM) +
                    padLeft(item.quantity.toString(), SALE_COLUMNS.QTY) +
                    padLeft(formatCurrency(item.price), SALE_COLUMNS.PRICE) +
                    padLeft(formatCurrency(item.total), SALE_COLUMNS.TOTAL)
                );
            });

            // Summary if needed
            if (remainingCount > 0) {
                lines.push(padRight(`+${remainingCount} items`, SALE_COLUMNS.ITEM + SALE_COLUMNS.QTY + SALE_COLUMNS.PRICE) + padLeft(formatCurrency(remainingTotal), SALE_COLUMNS.TOTAL));
            }

            // Discount line (if applicable)
            if (discountAmount && discountAmount > 0) {
                lines.push(padRight(`Discount`, totalWidth - 12) + padLeft(`-${formatCurrency(discountAmount)}`, 12));
            }

            // Totals (VAT is inclusive in product prices)
            const currentTaxRate = taxRate || 12;
            const vatableSales = total / (1 + currentTaxRate / 100);
            const vatAmount = total - vatableSales;

            lines.push('-'.repeat(totalWidth));
            lines.push(padRight('VATable Sales', totalWidth - 12) + padLeft(formatCurrency(vatableSales), 12));
            lines.push(padRight('Less VAT', totalWidth - 12) + padLeft(formatCurrency(vatAmount), 12));
            lines.push(padRight('TOTAL SALES(VAT Inclusive)', totalWidth - 12) + padLeft(formatCurrency(total), 12));
            lines.push('-'.repeat(totalWidth));

            // Payment
            if (paymentMethod.toLowerCase() === 'term') {
                lines.push(`TERM: AMOUNT DUE ${formatCurrency(remainingBalance || amountReceived || 0)}`);
                lines.push(`DUE DATE: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}`);
            } else {
                lines.push(`PMT:${paymentMethod.toUpperCase()} ${amountReceived ? `CASH:${formatCurrency(amountReceived)}` : ''} ${change ? `CHG:${formatCurrency(change)}` : ''}`);
                if (referenceNumber) {
                    lines.push(`REF:${referenceNumber}`);
                }
            }
        }

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
            lines.push(termPaymentMode && customerName ? `Printed Name: ${customerName}` : deliveredTo ? `Printed Name: ${deliveredTo}` : '');

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