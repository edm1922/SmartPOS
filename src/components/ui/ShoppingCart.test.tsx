import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShoppingCart } from './ShoppingCart';

// Mock the Button and Card components since they're already tested separately
jest.mock('./Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  )
}));

jest.mock('./Card', () => {
  const MockCard = ({ children, className }: any) => (
    <div className={className} data-testid="card">{children}</div>
  );
  
  MockCard.Header = ({ children, className }: any) => (
    <div className={className} data-testid="card-header">{children}</div>
  );
  
  MockCard.Content = ({ children, className }: any) => (
    <div className={className} data-testid="card-content">{children}</div>
  );
  
  MockCard.Footer = ({ children, className }: any) => (
    <div className={className} data-testid="card-footer">{children}</div>
  );
  
  return {
    Card: MockCard
  };
});

describe('ShoppingCart', () => {
  const mockCartItems = [
    {
      id: '1',
      name: 'Product 1',
      price: 10.99,
      quantity: 2,
      stock_quantity: 10
    },
    {
      id: '2',
      name: 'Product 2',
      price: 5.50,
      quantity: 1,
      stock_quantity: 5
    }
  ];

  const mockProps = {
    cartItems: mockCartItems,
    onRemoveItem: jest.fn(),
    onUpdateQuantity: jest.fn(),
    onClearCart: jest.fn(),
    subtotal: 27.48,
    tax: 2.20,
    total: 29.68,
    onProcessPayment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty cart state correctly', () => {
    render(<ShoppingCart {...mockProps} cartItems={[]} />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Add products to get started')).toBeInTheDocument();
  });

  it('renders cart items correctly', () => {
    render(<ShoppingCart {...mockProps} />);
    
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('$10.99 each')).toBeInTheDocument();
    expect(screen.getByText('$21.98')).toBeInTheDocument(); // 2 * 10.99
    
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('$5.50 each')).toBeInTheDocument();
    expect(screen.getByText('$5.50')).toBeInTheDocument(); // 1 * 5.50
  });

  it('calls onRemoveItem when remove button is clicked', () => {
    render(<ShoppingCart {...mockProps} />);
    
    const removeButtons = screen.getAllByRole('button', { name: '' });
    // The remove button is the one with the trash icon
    fireEvent.click(removeButtons[2]);
    
    expect(mockProps.onRemoveItem).toHaveBeenCalledWith('1');
  });

  it('calls onUpdateQuantity when quantity buttons are clicked', () => {
    render(<ShoppingCart {...mockProps} />);
    
    // Test increase quantity
    const increaseButtons = screen.getAllByRole('button', { name: /\+/i });
    fireEvent.click(increaseButtons[0]);
    expect(mockProps.onUpdateQuantity).toHaveBeenCalledWith('1', 3);
    
    // Test decrease quantity
    const decreaseButtons = screen.getAllByRole('button', { name: /-/i });
    fireEvent.click(decreaseButtons[0]);
    expect(mockProps.onUpdateQuantity).toHaveBeenCalledWith('1', 1);
  });

  it('disables decrease button when quantity is 1', () => {
    const singleItemCart = [{
      id: '1',
      name: 'Product 1',
      price: 10.99,
      quantity: 1,
      stock_quantity: 10
    }];
    
    render(<ShoppingCart {...mockProps} cartItems={singleItemCart} />);
    
    const decreaseButtons = screen.getAllByRole('button', { name: /-/i });
    expect(decreaseButtons[0]).toBeDisabled();
  });

  it('disables increase button when quantity equals stock', () => {
    const maxStockItem = [{
      id: '1',
      name: 'Product 1',
      price: 10.99,
      quantity: 10,
      stock_quantity: 10
    }];
    
    render(<ShoppingCart {...mockProps} cartItems={maxStockItem} />);
    
    const increaseButtons = screen.getAllByRole('button', { name: /\+/i });
    expect(increaseButtons[0]).toBeDisabled();
  });

  it('calls onClearCart when clear button is clicked', () => {
    render(<ShoppingCart {...mockProps} />);
    
    // There are two clear buttons, one in header and one in footer
    const clearButtons = screen.getAllByRole('button', { name: /clear/i });
    fireEvent.click(clearButtons[0]);
    
    expect(mockProps.onClearCart).toHaveBeenCalled();
  });

  it('calls onProcessPayment when checkout button is clicked', () => {
    render(<ShoppingCart {...mockProps} />);
    
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);
    
    expect(mockProps.onProcessPayment).toHaveBeenCalled();
  });

  it('displays correct pricing information', () => {
    render(<ShoppingCart {...mockProps} />);
    
    expect(screen.getByText('$27.48')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('$2.20')).toBeInTheDocument(); // tax
    expect(screen.getByText('$29.68')).toBeInTheDocument(); // total
  });
});