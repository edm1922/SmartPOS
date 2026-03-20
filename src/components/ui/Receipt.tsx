import React from 'react';
import { Button } from './Button';

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
  deliveredTo?: string;
  tin?: string;
  orNumber?: string;
  onPrint: () => void;
  onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({
  transactionId,
  date,
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  amountReceived,
  change,
  deliveredTo,
  tin,
  orNumber,
  onPrint,
  onClose
}) => {
  return (
    <div className="bg-white p-6 rounded-lg max-w-md mx-auto">
      {/* Store Header */}
      <div className="text-center border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">AJ SOFTDRIVE STORE</h2>
        <p className="text-gray-600 text-sm">123 Main Street, City, State 12345</p>
        <p className="text-gray-600 text-sm">Phone: (555) 123-4567</p>
      </div>

      {/* Transaction Info */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600 text-sm">Transaction ID:</span>
          <span className="text-sm font-mono">{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 text-sm">Date:</span>
          <span className="text-sm">{date}</span>
        </div>
        {deliveredTo && (
          <div className="flex justify-between mt-1">
            <span className="text-gray-600 text-sm">Delivered To:</span>
            <span className="text-sm">{deliveredTo}</span>
          </div>
        )}
        {tin && (
          <div className="flex justify-between mt-1">
            <span className="text-gray-600 text-sm">TIN:</span>
            <span className="text-sm font-mono">{tin}</span>
          </div>
        )}
        {orNumber && (
          <div className="flex justify-between mt-1">
            <span className="text-red-500 text-sm font-bold">Purchase Order:</span>
            <span className="text-sm font-mono font-bold text-red-600">{orNumber}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-4">
        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-100 text-xs">
            <thead>
              <tr className="bg-gray-50 uppercase text-[9px] font-black text-gray-400">
                <th className="border border-gray-100 px-2 py-1 text-center">Qty</th>
                <th className="border border-gray-100 px-2 py-1 text-left">Description</th>
                <th className="border border-gray-100 px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-100 px-2 py-1 text-center font-bold">{item.quantity}</td>
                  <td className="border border-gray-100 px-2 py-1">
                    <p className="font-bold text-gray-800 uppercase text-[10px]">{item.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold">@{item.price.toFixed(2)}</p>
                  </td>
                  <td className="border border-gray-100 px-2 py-1 text-right font-black">{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">VAT:</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg my-2">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Payment Method:</span>
          <span className="capitalize">{paymentMethod}</span>
        </div>
        {amountReceived !== undefined && (
          <>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Amount Received:</span>
              <span>${amountReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Change:</span>
              <span>${change?.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Signature Area */}
      <div className="grid grid-cols-2 gap-4 mb-8 mt-12 px-4">
        <div className="text-center pt-4 border-t border-gray-300">
          <p className="text-[10px] uppercase font-bold text-gray-400">Cashier</p>
        </div>
        <div className="text-center pt-4 border-t border-gray-300">
          <p className="text-[10px] uppercase font-bold text-gray-400">Customer</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 mb-6">
        <p>Thank you for your purchase!</p>
        <p>Please come again.</p>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onPrint}>
          Print Receipt
        </Button>
      </div>
    </div>
  );
};