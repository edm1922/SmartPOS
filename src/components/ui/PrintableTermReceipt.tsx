import React from 'react';

interface TermAllocation {
    transactionId: string;
    amount: number;
}

interface TermReceiptProps {
    id: string;
    date: string;
    customerName: string;
    cashierName?: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    allocations: TermAllocation[];
    remainingBalance: number;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    showAddressOnReceipt?: boolean;
    showPhoneOnReceipt?: boolean;
}

export const PrintableTermReceipt: React.FC<TermReceiptProps> = ({
    id,
    date,
    customerName,
    cashierName,
    amount,
    paymentMethod,
    referenceNumber,
    notes,
    allocations,
    remainingBalance,
    storeName = 'SMART POS',
    storeAddress = '',
    storePhone = '',
    receiptHeader = '',
    receiptFooter = 'Thank you for your payment!',
    showAddressOnReceipt = true,
    showPhoneOnReceipt = true,
}) => {
    const formatCurrency = (amt: number) => amt.toFixed(2);

    const formatDate = (dateString: string) => {
        try {
            const d = new Date(dateString);
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return dateString;
        }
    };

    const COLUMNS = { LABEL: 38, VALUE: 12 };
    const TOTAL_WIDTH = COLUMNS.LABEL + COLUMNS.VALUE;

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
        if (showAddressOnReceipt && storeAddress) lines.push(storeAddress);
        if (showPhoneOnReceipt && storePhone) lines.push(`Tel: ${storePhone}`);
        if (receiptHeader) lines.push(receiptHeader);

        lines.push('TERM PAYMENT RECEIPT');
        lines.push(`REF:${id.substring(0, 8).toUpperCase()} DATE:${formatDate(date)}`);
        lines.push(`CSR:${cashierName || 'SYSTEM'} CUST:${customerName}`);

        lines.push('-'.repeat(TOTAL_WIDTH));

        // Payment info
        lines.push(padRight('Amount Paid', TOTAL_WIDTH - 12) + padLeft(formatCurrency(amount), 12));
        lines.push(`PMT:${paymentMethod.toUpperCase()}`);
        if (referenceNumber) lines.push(`REF:${referenceNumber}`);
        if (notes) lines.push(`NOTES:${notes}`);

        lines.push('-'.repeat(TOTAL_WIDTH));

        // Allocations
        lines.push('ALLOCATIONS');
        allocations.forEach(a => {
            lines.push(
                `  #${a.transactionId.substring(0, 8)}` +
                padLeft(formatCurrency(a.amount), TOTAL_WIDTH - 22)
            );
        });

        lines.push('-'.repeat(TOTAL_WIDTH));

        // Remaining balance
        lines.push(padRight('Remaining Balance', TOTAL_WIDTH - 12) + padLeft(formatCurrency(remainingBalance), 12));

        lines.push('-'.repeat(TOTAL_WIDTH));

        // Footer
        lines.push(receiptFooter);
        lines.push('');
        lines.push('Customer Signature:');
        lines.push('_'.repeat(35));
        lines.push(`Printed Name: ${customerName}`);
        lines.push('');
        lines.push('Cashier Signature:');
        lines.push('_'.repeat(35));
        lines.push(cashierName ? `Printed Name: ${cashierName}` : '');
        lines.push('');
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
