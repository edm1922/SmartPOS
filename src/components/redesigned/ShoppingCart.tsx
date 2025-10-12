'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
}

interface ShoppingCartProps {
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onProcessPayment: () => void;
  onClearCart: () => void;
  className?: string;
}

export function ShoppingCart({ 
  cart, 
  onRemoveItem, 
  onUpdateQuantity, 
  onProcessPayment, 
  onClearCart,
  className 
}: ShoppingCartProps) {
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Shopping Cart</span>
          {cart.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearCart}
              className="text-destructive hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
            <p className="mt-1 text-sm text-gray-500">Add products to the cart</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                  <p className="text-sm text-gray-500">Stock: {item.stock_quantity}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    variant="secondary"
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    variant="secondary"
                    size="sm"
                    className="w-8 h-8 p-0"
                    disabled={item.quantity >= item.stock_quantity}
                  >
                    +
                  </Button>
                  <Button 
                    onClick={() => onRemoveItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="ml-2 w-8 h-8 p-0 text-destructive hover:text-destructive"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4">
        <div className="w-full">
          <div className="flex justify-between text-lg font-bold mb-4">
            <span>Total:</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
          <Button 
            className="w-full"
            disabled={cart.length === 0}
            onClick={onProcessPayment}
            size="lg"
          >
            Process Payment
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}