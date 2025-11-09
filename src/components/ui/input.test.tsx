/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('should render without crashing', () => {
    render(<Input />);
  });

  it('should render with custom className', () => {
    render(<Input className="custom-class" />);
  });
});