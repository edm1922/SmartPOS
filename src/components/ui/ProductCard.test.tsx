import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';

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

jest.mock('./Card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">{children}</div>
  )
}));

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 19.99,
    barcode: '123456789',
    stock_quantity: 10,
    image_url: 'https://example.com/image.jpg'
  };

  const mockOnAddToCart = jest.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    
    // Check that the button is present
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
  });

  it('renders product image when available', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('shows placeholder when no image is available', () => {
    const productWithoutImage = { ...mockProduct, image_url: undefined };
    render(<ProductCard product={productWithoutImage} onAddToCart={mockOnAddToCart} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('shows "Out of Stock" button when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };
    render(<ProductCard product={outOfStockProduct} onAddToCart={mockOnAddToCart} />);
    
    const button = screen.getByRole('button', { name: 'Out of Stock' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-variant', 'secondary');
  });

  it('shows "Low Stock" indicator when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stock_quantity: 3 };
    render(<ProductCard product={lowStockProduct} onAddToCart={mockOnAddToCart} />);
    
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    const button = screen.getByText('Add to Cart');
    fireEvent.click(button);
    
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('disables button when product is out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };
    render(<ProductCard product={outOfStockProduct} onAddToCart={mockOnAddToCart} />);
    
    const button = screen.getByRole('button', { name: 'Out of Stock' });
    expect(button).toBeDisabled();
  });
});