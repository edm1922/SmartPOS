import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
}

interface ShoppingCartProps {
  cartItems: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onClearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
  onProcessPayment: () => void;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  cartItems,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
  subtotal,
  tax,
  total,
  onProcessPayment
}) => {
  return (
    <Card className="h-full flex flex-col">
      <Card.Header className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
        {cartItems.length > 0 && (
          <Button 
            variant="danger" 
            size="sm" 
            onClick={onClearCart}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </Card.Header>
      
      <Card.Content className="flex-1 overflow-y-auto p-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-sm text-gray-500">Add products to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 ml-2">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      variant="secondary"
                      size="sm"
                      className="w-8 h-8 p-0"
                      disabled={item.quantity <= 1}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </Button>
                    
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    
                    <Button 
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      variant="secondary"
                      size="sm"
                      className="w-8 h-8 p-0"
                      disabled={item.quantity >= item.stock_quantity}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">Stock: {item.stock_quantity}</span>
                    <Button 
                      onClick={() => onRemoveItem(item.id)}
                      variant="danger"
                      size="sm"
                      className="w-8 h-8 p-0 ml-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
      
      {cartItems.length > 0 && (
        <Card.Footer className="p-4 bg-gray-50 rounded-b-xl">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={onClearCart}
            >
              Clear
            </Button>
            <Button 
              className="flex-1"
              onClick={onProcessPayment}
            >
              Checkout
            </Button>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
};