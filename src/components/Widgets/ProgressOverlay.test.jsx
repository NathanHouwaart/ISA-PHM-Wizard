import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressOverlay from './ProgressOverlay';

describe('ProgressOverlay', () => {
  describe('Rendering', () => {
    test('renders when progress is provided', () => {
      const progress = { percent: 50, message: 'Processing files...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay')).toBeInTheDocument();
    });

    test('does not render when progress is null', () => {
      render(<ProgressOverlay progress={null} />);
      expect(screen.queryByTestId('progress-overlay')).not.toBeInTheDocument();
    });

    test('displays progress message', () => {
      const progress = { percent: 65, message: 'Indexing dataset...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay-message')).toHaveTextContent('Indexing dataset...');
    });

    test('displays progress percentage', () => {
      const progress = { percent: 75, message: 'Loading...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay-percent')).toHaveTextContent('75%');
    });

    test('renders progress bar with correct width', () => {
      const progress = { percent: 40, message: 'Processing...' };
      render(<ProgressOverlay progress={progress} />);
      const progressBar = screen.getByTestId('progress-overlay-bar').firstChild;
      expect(progressBar).toHaveStyle({ width: '40%' });
    });
  });

  describe('Edge Cases', () => {
    test('clamps progress percentage to 0 minimum', () => {
      const progress = { percent: -10, message: 'Starting...' };
      render(<ProgressOverlay progress={progress} />);
      const progressBar = screen.getByTestId('progress-overlay-bar').firstChild;
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    test('clamps progress percentage to 100 maximum', () => {
      const progress = { percent: 150, message: 'Finishing...' };
      render(<ProgressOverlay progress={progress} />);
      const progressBar = screen.getByTestId('progress-overlay-bar').firstChild;
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    test('handles empty message', () => {
      const progress = { percent: 50, message: '' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay-message')).toHaveTextContent('');
    });

    test('handles zero percent', () => {
      const progress = { percent: 0, message: 'Starting...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay-percent')).toHaveTextContent('0%');
      const progressBar = screen.getByTestId('progress-overlay-bar').firstChild;
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    test('handles 100 percent', () => {
      const progress = { percent: 100, message: 'Complete!' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay-percent')).toHaveTextContent('100%');
      const progressBar = screen.getByTestId('progress-overlay-bar').firstChild;
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Accessibility', () => {
    test('has role="status" for screen readers', () => {
      const progress = { percent: 50, message: 'Processing...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay')).toHaveAttribute('role', 'status');
    });

    test('has aria-live="polite" for dynamic updates', () => {
      const progress = { percent: 50, message: 'Processing...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay')).toHaveAttribute('aria-live', 'polite');
    });

    test('has descriptive aria-label', () => {
      const progress = { percent: 75, message: 'Saving to database...' };
      render(<ProgressOverlay progress={progress} />);
      expect(screen.getByTestId('progress-overlay')).toHaveAttribute('aria-label', 'Saving to database... 75%');
    });
  });

  describe('Styling', () => {
    test('applies custom className', () => {
      const progress = { percent: 50, message: 'Processing...' };
      render(<ProgressOverlay progress={progress} className="custom-class" />);
      expect(screen.getByTestId('progress-overlay')).toHaveClass('custom-class');
    });

    test('applies custom data-testid', () => {
      const progress = { percent: 50, message: 'Processing...' };
      render(<ProgressOverlay progress={progress} data-testid="custom-overlay" />);
      expect(screen.getByTestId('custom-overlay')).toBeInTheDocument();
    });
  });
});
