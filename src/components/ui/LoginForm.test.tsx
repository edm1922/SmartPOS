import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

// Mock the Button and Card components since they're already tested separately
jest.mock('./Button', () => ({
  Button: ({ children, onClick, disabled, className, type, size }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={className}
      type={type}
      data-size={size}
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

describe('LoginForm', () => {
  const mockProps = {
    title: 'Admin Login',
    subtitle: 'Sign in to access the admin panel',
    onSubmit: jest.fn(),
    loading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with correct title and subtitle', () => {
    render(<LoginForm {...mockProps} />);
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access the admin panel')).toBeInTheDocument();
  });

  it('renders email and password input fields', () => {
    render(<LoginForm {...mockProps} />);
    
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    render(<LoginForm {...mockProps} />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    expect(mockProps.onSubmit).toHaveBeenCalledWith('admin@example.com', 'password123');
  });

  it('shows error message when error prop is provided', () => {
    const errorProps = {
      ...mockProps,
      error: 'Invalid credentials'
    };
    
    render(<LoginForm {...errorProps} />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    const loadingProps = {
      ...mockProps,
      loading: true
    };
    
    render(<LoginForm {...loadingProps} />);
    
    expect(screen.getByRole('button', { name: /Signing in/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('updates email and password state when inputs change', () => {
    render(<LoginForm {...mockProps} />);
    
    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
    
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('newpassword');
  });
});