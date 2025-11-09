'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onCompletePayment: (paymentMethod: 'cash' | 'card' | 'mobile', amountReceived?: number) => void;
}

export function PaymentModal({ isOpen, onClose, total, onCompletePayment }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountReceived, setAmountReceived] = useState('');

  const calculateChange = () => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  };

  const handleCompletePayment = () => {
    if (paymentMethod === 'cash') {
      onCompletePayment(paymentMethod, parseFloat(amountReceived) || 0);
    } else {
      onCompletePayment(paymentMethod);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'cash' ? "default" : "outline"}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'card' ? "default" : "outline"}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'mobile' ? "default" : "outline"}
                onClick={() => setPaymentMethod('mobile')}
              >
                Mobile
              </Button>
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <Label htmlFor="amountReceived" className="block text-sm font-medium text-gray-700 mb-2">
                Amount Received
              </Label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <Input
                  type="number"
                  id="amountReceived"
                  className="pl-7"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  step="0.01"
                />
              </div>
              {amountReceived && (
                <div className="mt-2 text-sm text-gray-500">
                  Change: ${calculateChange().toFixed(2)}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCompletePayment}>
              Complete Transaction
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}