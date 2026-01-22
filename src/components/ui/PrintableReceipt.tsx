import React from 'react';

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
    taxRate?: number;
    cashierName?: string;
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
    storeName = 'SMART POS',
    storeAddress,
    storePhone,
    cashierName
}) => {
    // formatting helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="printable-content font-mono text-xs text-black bg-white p-4 max-w-[80mm] mx-auto">
            {/* Store Header */}
            <div className="text-center mb-4">
                <h2 className="font-bold text-lg uppercase">{storeName}</h2>
                {storeAddress && <p>{storeAddress}</p>}
                {storePhone && <p>Tel: {storePhone}</p>}
            </div>

            {/* Transaction Details */}
            <div className="mb-4 border-b border-black pb-2 border-dashed">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(date)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Trans ID:</span>
                    <span>{transactionId?.substring(0, 12)}...</span>
                </div>
                {cashierName && (
                    <div className="flex justify-between">
                        <span>Cashier:</span>
                        <span>{cashierName}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="mb-4 border-b border-black pb-2 border-dashed">
                <div className="uppercase font-bold mb-2 grid grid-cols-12 gap-1 text-[10px]">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-4 text-right">Total</span>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-1 mb-1">
                        <div className="col-span-6 overflow-hidden text-ellipsis whitespace-nowrap">
                            {item.name}
                            <div className="text-[10px] text-gray-500">@{formatCurrency(item.price)}</div>
                        </div>
                        <div className="col-span-2 text-right">{item.quantity}</div>
                        <div className="col-span-4 text-right">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-black border-dashed pt-2 mt-2">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>

            {/* Payment Info */}
            <div className="mb-6 border-t border-black border-dashed pt-2">
                <div className="flex justify-between">
                    <span className="uppercase">{paymentMethod}:</span>
                    <span>{formatCurrency(total)}</span>
                </div>
                {amountReceived !== undefined && (
                    <>
                        <div className="flex justify-between text-xs mt-1">
                            <span>Tendered:</span>
                            <span>{formatCurrency(amountReceived)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>Change:</span>
                            <span>{formatCurrency(change || 0)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px]">
                <p>Thank you for your purchase!</p>
                <p>Software by Antigravity</p>
            </div>

            <style jsx>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          .printable-content {
             width: 100%;
             max-width: none;
             padding: 0;
          }
        }
      `}</style>
        </div>
    );
};
