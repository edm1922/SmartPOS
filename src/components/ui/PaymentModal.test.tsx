import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentModal } from './PaymentModal';

// Mock the Button and Card components since they're already tested separately
jest.mock('./Button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
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
  
  MockCard.Content = ({ children, className }: any) => (
    <div className={className} data-testid="card-content">{children}</div>
  );
  
  return {
    Card: MockCard,
    CardContent: ({ children, className }: any) => (
      <div className={className} data-testid="card-content">{children}</div>
    )
  };
});

describe('PaymentModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    subtotal: 25.50,
    tax: 2.04,
    total: 27.54,
    onPaymentComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<PaymentModal {...mockProps} />);
    
    expect(screen.getByText('Process Payment')).toBeInTheDocument();
    expect(screen.getByText('$25.50')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('$2.04')).toBeInTheDocument(); // tax
    expect(screen.getByText('$27.54')).toBeInTheDocument(); // total
    
    // Check payment method buttons
    expect(screen.getByRole('button', { name: /Cash/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Card/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mobile/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PaymentModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Process Payment')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<PaymentModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<PaymentModal {...mockProps} />);
    
    const backdrop = screen.getByTestId('backdrop');
    fireEvent.click(backdrop);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('switches between payment methods', () => {
    render(<PaymentModal {...mockProps} />);
    
    // Initially cash should be selected
    const cashButton = screen.getByRole('button', { name: /Cash/i });
    expect(cashButton).toHaveClass('bg-primary-100');
    
    // Click card button
    const cardButton = screen.getByRole('button', { name: /Card/i });
    fireEvent.click(cardButton);
    
    // Card should now be selected
    expect(cardButton).toHaveClass('bg-primary-100');
    
    // Cash should no longer be selected
    expect(cashButton).not.toHaveClass('bg-primary-100');
  });

  it('shows amount received input when cash is selected', () => {
    render(<PaymentModal {...mockProps} />);
    
    const amountInput = screen.getByLabelText('Amount Received');
    expect(amountInput).toBeInTheDocument();
  });

  it('hides amount received input when card is selected', () => {
    render(<PaymentModal {...mockProps} />);
    
    // Switch to card payment
    const cardButton = screen.getByRole('button', { name: /Card/i });
    fireEvent.click(cardButton);
    
    const amountInput = screen.queryByLabelText('Amount Received');
    expect(amountInput).not.toBeInTheDocument();
  });

  it('calculates change correctly', () => {
    render(<PaymentModal {...mockProps} />);
    
    const amountInput = screen.getByLabelText('Amount Received');
    fireEvent.change(amountInput, { target: { value: '30.00' } });
    
    expect(screen.getByText('$2.46')).toBeInTheDocument(); // change
  });

  it('calls onPaymentComplete with cash payment data', () => {
    render(<PaymentModal {...mockProps} />);
    
    const amountInput = screen.getByLabelText('Amount Received');
    fireEvent.change(amountInput, { target: { value: '30.00' } });
    
    const completeButton = screen.getByRole('button', { name: /Complete Payment/i });
    fireEvent.click(completeButton);
    
    // Check that the function was called with the correct parameters
    expect(mockProps.onPaymentComplete).toHaveBeenCalled();
    const call = mockProps.onPaymentComplete.mock.calls[0][0];
    expect(call.method).toBe('cash');
    expect(call.amountReceived).toBe(30.00);
    expect(call.change).toBeCloseTo(2.46);
  });

  it('calls onPaymentComplete with card payment data', () => {
    render(<PaymentModal {...mockProps} />);
    
    // Switch to card payment
    const cardButton = screen.getByRole('button', { name: /Card/i });
    fireEvent.click(cardButton);
    
    const completeButton = screen.getByRole('button', { name: /Complete Payment/i });
    fireEvent.click(completeButton);
    
    expect(mockProps.onPaymentComplete).toHaveBeenCalledWith({
      method: 'card'
    });
  });

  it('disables complete button when cash amount is insufficient', () => {
    render(<PaymentModal {...mockProps} />);
    
    const amountInput = screen.getByLabelText('Amount Received');
    fireEvent.change(amountInput, { target: { value: '20.00' } }); // Less than total
    
    const completeButton = screen.getByRole('button', { name: /Complete Payment/i });
    expect(completeButton).toBeDisabled();
  });

  it('enables complete button when cash amount is sufficient', () => {
    render(<PaymentModal {...mockProps} />);
    
    const amountInput = screen.getByLabelText('Amount Received');
    fireEvent.change(amountInput, { target: { value: '30.00' } }); // More than total
    
    const completeButton = screen.getByRole('button', { name: /Complete Payment/i });
    expect(completeButton).not.toBeDisabled();
  });
});