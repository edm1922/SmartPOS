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
  onPrint,
  onClose
}) => {
  return (
    <div className="bg-white p-6 rounded-lg max-w-md mx-auto">
      {/* Store Header */}
      <div className="text-center border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">ACME STORE</h2>
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
      </div>
      
      {/* Items */}
      <div className="mb-4">
        <h3 className="font-medium text-gray-900 mb-2">Items:</h3>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-600"> x{item.quantity}</span>
              </div>
              <span className="text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Tax:</span>
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