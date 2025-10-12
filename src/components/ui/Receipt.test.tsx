import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Receipt } from './Receipt';

// Mock the Button component since it's already tested separately
jest.mock('./Button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  )
}));

describe('Receipt', () => {
  const mockProps = {
    transactionId: 'TXN123456',
    date: '2023-05-15 14:30:22',
    items: [
      { name: 'Product 1', price: 10.99, quantity: 2 },
      { name: 'Product 2', price: 5.50, quantity: 1 }
    ],
    subtotal: 27.48,
    tax: 2.20,
    total: 29.68,
    paymentMethod: 'cash',
    amountReceived: 30.00,
    change: 0.32,
    onPrint: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders receipt information correctly', () => {
    render(<Receipt {...mockProps} />);
    
    // Check store header
    expect(screen.getByText('ACME STORE')).toBeInTheDocument();
    expect(screen.getByText('123 Main Street, City, State 12345')).toBeInTheDocument();
    expect(screen.getByText('Phone: (555) 123-4567')).toBeInTheDocument();
    
    // Check transaction info
    expect(screen.getByText('TXN123456')).toBeInTheDocument();
    expect(screen.getByText('2023-05-15 14:30:22')).toBeInTheDocument();
    
    // Check items
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getByText('$21.98')).toBeInTheDocument(); // 10.99 * 2
    
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('x1')).toBeInTheDocument();
    expect(screen.getByText('$5.50')).toBeInTheDocument(); // 5.50 * 1
    
    // Check totals
    expect(screen.getByText('$27.48')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('$2.20')).toBeInTheDocument(); // tax
    expect(screen.getByText('$29.68')).toBeInTheDocument(); // total
    expect(screen.getByText('cash')).toBeInTheDocument(); // payment method
    expect(screen.getByText('$30.00')).toBeInTheDocument(); // amount received
    expect(screen.getByText('$0.32')).toBeInTheDocument(); // change
    
    // Check footer
    expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument();
    expect(screen.getByText('Please come again.')).toBeInTheDocument();
  });

  it('renders correctly without amount received and change for non-cash payments', () => {
    const cardPaymentProps = {
      ...mockProps,
      paymentMethod: 'card',
      amountReceived: undefined,
      change: undefined
    };
    
    render(<Receipt {...cardPaymentProps} />);
    
    expect(screen.queryByText('Amount Received:')).not.toBeInTheDocument();
    expect(screen.queryByText('Change:')).not.toBeInTheDocument();
    
    expect(screen.getByText('card')).toBeInTheDocument(); // payment method
  });

  it('calls onPrint when Print Receipt button is clicked', () => {
    render(<Receipt {...mockProps} />);
    
    const printButton = screen.getByRole('button', { name: /Print Receipt/i });
    fireEvent.click(printButton);
    
    expect(mockProps.onPrint).toHaveBeenCalled();
  });

  it('calls onClose when Close button is clicked', () => {
    render(<Receipt {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});