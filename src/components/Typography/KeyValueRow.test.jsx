import React from 'react';
import { render, screen } from '@testing-library/react';
import KeyValueRow from './KeyValueRow';

describe('KeyValueRow', () => {
  describe('Rendering', () => {
    test('renders label and value', () => {
      render(<KeyValueRow label="Dataset" value="My Dataset" />);
      expect(screen.getByTestId('key-value-row-label')).toHaveTextContent('Dataset:');
      expect(screen.getByTestId('key-value-row-value')).toHaveTextContent('My Dataset');
    });

    test('renders JSX as value', () => {
      const value = <span className="text-green-600">Active</span>;
      render(<KeyValueRow label="Status" value={value} />);
      expect(screen.getByTestId('key-value-row-value')).toContainHTML('<span class="text-green-600">Active</span>');
    });

    test('shows loading spinner when loading is true', () => {
      render(<KeyValueRow label="Dataset" value="Loading..." loading={true} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Loading Dataset')).toBeInTheDocument(); // sr-only text
    });

    test('does not show loading spinner when loading is false', () => {
      render(<KeyValueRow label="Dataset" value="My Dataset" loading={false} />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByTestId('key-value-row-value')).toHaveTextContent('My Dataset');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty string value', () => {
      render(<KeyValueRow label="Name" value="" />);
      expect(screen.getByTestId('key-value-row-value')).toHaveTextContent('');
    });

    test('handles numeric value', () => {
      render(<KeyValueRow label="Count" value={42} />);
      expect(screen.getByTestId('key-value-row-value')).toHaveTextContent('42');
    });

    test('handles null value', () => {
      render(<KeyValueRow label="Optional" value={null} />);
      expect(screen.getByTestId('key-value-row-value')).toBeEmptyDOMElement();
    });

    test('handles undefined value', () => {
      render(<KeyValueRow label="Optional" value={undefined} />);
      expect(screen.getByTestId('key-value-row-value')).toBeEmptyDOMElement();
    });

    test('handles very long value text', () => {
      const longValue = 'A'.repeat(200);
      render(<KeyValueRow label="Description" value={longValue} />);
      expect(screen.getByTestId('key-value-row-value')).toHaveTextContent(longValue);
    });
  });

  describe('Styling', () => {
    test('applies custom className to container', () => {
      render(<KeyValueRow label="Name" value="Value" className="custom-class" />);
      expect(screen.getByTestId('key-value-row')).toHaveClass('custom-class');
    });

    test('applies custom labelClassName', () => {
      render(<KeyValueRow label="Name" value="Value" labelClassName="label-custom" />);
      expect(screen.getByTestId('key-value-row-label')).toHaveClass('label-custom');
    });

    test('applies custom valueClassName', () => {
      render(<KeyValueRow label="Name" value="Value" valueClassName="value-custom" />);
      expect(screen.getByTestId('key-value-row-value')).toHaveClass('value-custom');
    });

    test('applies custom data-testid', () => {
      render(<KeyValueRow label="Name" value="Value" data-testid="custom-row" />);
      expect(screen.getByTestId('custom-row')).toBeInTheDocument();
    });

    test('maintains grid layout classes', () => {
      render(<KeyValueRow label="Name" value="Value" />);
      const container = screen.getByTestId('key-value-row');
      expect(container).toHaveClass('grid', 'grid-cols-12', 'gap-x-5', 'items-center');
    });
  });

  describe('Accessibility', () => {
    test('loading spinner has sr-only text for screen readers', () => {
      render(<KeyValueRow label="Data" value="Loading..." loading={true} />);
      const srText = screen.getByText('Loading Data');
      expect(srText).toHaveClass('sr-only');
    });

    test('spinner is hidden from screen readers with aria-hidden', () => {
      render(<KeyValueRow label="Data" value="Loading..." loading={true} />);
      const svg = screen.getByTestId('key-value-row-value').querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Integration', () => {
    test('works with complex React components as values', () => {
      const ComplexValue = () => (
        <div>
          <span className="font-bold">Status:</span>
          <span className="text-green-500 ml-2">Online</span>
        </div>
      );
      render(<KeyValueRow label="Server" value={<ComplexValue />} />);
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    test('handles conditional rendering in value', () => {
      const value = <>{true && <span>Shown</span>}</>;
      render(<KeyValueRow label="Conditional" value={value} />);
      expect(screen.getByText('Shown')).toBeInTheDocument();
    });
  });
});
