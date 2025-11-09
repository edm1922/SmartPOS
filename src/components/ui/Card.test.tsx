import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders correctly with default props', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(
      <Card className="custom-class">
        <CardContent>Content</CardContent>
      </Card>
    );
    
    const card = screen.getByText('Content').closest('.rounded-lg');
    expect(card).toBeInTheDocument();
  });

  it('renders CardHeader with content', () => {
    render(
      <Card>
        <CardHeader className="custom-header">Header</CardHeader>
      </Card>
    );
    
    const header = screen.getByText('Header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('custom-header');
  });

  it('renders CardContent with content', () => {
    render(
      <Card>
        <CardContent className="custom-content">Content</CardContent>
      </Card>
    );
    
    const content = screen.getByText('Content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('custom-content');
  });

  it('renders CardFooter with content', () => {
    render(
      <Card>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    );
    
    const footer = screen.getByText('Footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('custom-footer');
  });
});