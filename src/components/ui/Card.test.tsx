import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders correctly with default props', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Content>Content</Card.Content>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );
    
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(
      <Card className="custom-class">
        <Card.Content>Content</Card.Content>
      </Card>
    );
    
    const card = screen.getByText('Content').closest('.bg-white');
    expect(card).toHaveClass('custom-class');
  });

  it('renders Card.Header with correct classes', () => {
    render(
      <Card>
        <Card.Header className="custom-header">Header</Card.Header>
      </Card>
    );
    
    const header = screen.getByText('Header');
    expect(header).toHaveClass('px-4');
    expect(header).toHaveClass('py-5');
    expect(header).toHaveClass('border-b');
    expect(header).toHaveClass('custom-header');
  });

  it('renders Card.Content with correct classes', () => {
    render(
      <Card>
        <Card.Content className="custom-content">Content</Card.Content>
      </Card>
    );
    
    const content = screen.getByText('Content');
    expect(content).toHaveClass('px-4');
    expect(content).toHaveClass('py-5');
    expect(content).toHaveClass('custom-content');
  });

  it('renders Card.Footer with correct classes', () => {
    render(
      <Card>
        <Card.Footer className="custom-footer">Footer</Card.Footer>
      </Card>
    );
    
    const footer = screen.getByText('Footer');
    expect(footer).toHaveClass('px-4');
    expect(footer).toHaveClass('py-4');
    expect(footer).toHaveClass('bg-gray-50');
    expect(footer).toHaveClass('custom-footer');
  });
});