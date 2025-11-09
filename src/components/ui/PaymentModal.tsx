import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  tax: number;
  total: number;
  onPaymentComplete: (paymentData: { method: 'cash' | 'card' | 'mobile', amountReceived?: number, change?: number }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  tax,
  total,
  onPaymentComplete
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [change, setChange] = useState<number>(0);

  // Calculate change when amount received changes
  useEffect(() => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived) || 0;
      setChange(Math.max(0, received - total));
    } else {
      setChange(0);
    }
  }, [amountReceived, total, paymentMethod]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setAmountReceived('');
      setChange(0);
    }
  }, [isOpen]);

  const handleCompletePayment = () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived) || 0;
      if (received < total) {
        // In a real app, you would show an error message
        return;
      }
      onPaymentComplete({
        method: paymentMethod,
        amountReceived: received,
        change: change
      });
    } else {
      onPaymentComplete({
        method: paymentMethod
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-out"
        onClick={onClose}
        data-testid="backdrop"
      ></div>

      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div 
          className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full max-w-md duration-300 ease-out scale-100 opacity-100" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                Process Payment
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1 transition-colors duration-200"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal body */}
          <div className="px-6 py-5">
            {/* Order summary */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment method selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`py-3 px-4 border rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="flex flex-col items-center">
                    <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Cash
                  </div>
                </button>
                <button
                  type="button"
                  className={`py-3 px-4 border rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'card'
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="flex flex-col items-center">
                    <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Card
                  </div>
                </button>
                <button
                  type="button"
                  className={`py-3 px-4 border rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'mobile'
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('mobile')}
                >
                  <div className="flex flex-col items-center">
                    <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Mobile
                  </div>
                </button>
              </div>
            </div>

            {/* Cash payment form */}
            {paymentMethod === 'cash' && (
              <div className="mb-6">
                <label htmlFor="amountReceived" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="amountReceived"
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-lg py-3 text-lg"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    step="0.01"
                    autoFocus
                  />
                </div>
                {amountReceived && (
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Change:</span>
                      <span className={`font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleCompletePayment}
                disabled={paymentMethod === 'cash' && (parseFloat(amountReceived) || 0) < total}
              >
                Complete Payment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};