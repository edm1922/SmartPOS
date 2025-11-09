/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import { Modal } from './Modal';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Modal', () => {
  it('should render without crashing', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(container.firstChild).toBeFalsy();
  });
});