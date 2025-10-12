'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  id: string;
  date: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
}

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  onPrint: () => void;
}

export function Receipt({ isOpen, onClose, receiptData, onPrint }: ReceiptProps) {
  if (!receiptData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="bg-white p-6 rounded-lg max-h-[70vh] overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">ACME STORE</h2>
            <p className="text-gray-600">123 Main Street, City, State 12345</p>
            <p className="text-gray-600">Phone: (555) 123-4567</p>
          </div>
          
          <div className="border-t border-b border-gray-200 py-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Transaction ID:</span>
              <span>{receiptData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{receiptData.date}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Items:</h3>
            <div className="space-y-2">
              {receiptData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600"> x{item.quantity}</span>
                  </div>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span>${receiptData.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-bold text-lg mb-2">
              <span>Total:</span>
              <span>${receiptData.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Payment Method:</span>
              <span className="capitalize">{receiptData.paymentMethod}</span>
            </div>
            {receiptData.paymentMethod === 'cash' && receiptData.amountReceived && (
              <>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount Received:</span>
                  <span>${receiptData.amountReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change:</span>
                  <span>${receiptData.change?.toFixed(2) || '0.00'}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-600 mb-6">
            <p>Thank you for your purchase!</p>
            <p>Please come again.</p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onPrint}>
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}