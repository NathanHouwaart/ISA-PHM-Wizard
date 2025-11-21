import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ExperimentTypePickerDialog from './ExperimentTypePickerDialog';
import { EXPERIMENT_TYPE_OPTIONS } from '../../constants/experimentTypes';

describe('ExperimentTypePickerDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    currentTypeId: 'diagnostic-single',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders when open is true', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      expect(screen.getByText('Select Experiment Template')).toBeInTheDocument();
    });

    test('does not render when open is false', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Select Experiment Template')).not.toBeInTheDocument();
    });

    test('renders all experiment type options', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      EXPERIMENT_TYPE_OPTIONS.forEach((option) => {
        expect(screen.getByText(option.title)).toBeInTheDocument();
      });
    });

    test('highlights the currently selected type', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} currentTypeId="diagnostic-single" />);
      const selectedOption = screen.getByText('Diagnostic experiment · single run').closest('button');
      expect(selectedOption).toHaveClass('border-blue-500');
    });
  });

  describe('Interactions', () => {
    test('closes when cancel button is clicked', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('closes when backdrop is clicked', () => {
      const { container } = render(<ExperimentTypePickerDialog {...defaultProps} />);
      const backdrop = container.querySelector('.absolute.inset-0');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('selects a different experiment type when clicked', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      const rtfOption = screen.getByText('Run-to-failure experiment · single condition measurement').closest('button');
      fireEvent.click(rtfOption);
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      expect(mockOnConfirm).toHaveBeenCalledWith('rtf-single');
    });

    test('applies selected type when Apply button is clicked', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      expect(mockOnConfirm).toHaveBeenCalledWith('diagnostic-single');
    });
  });

  describe('Edge Cases', () => {
    test('handles missing onConfirm gracefully', () => {
      const { rerender } = render(<ExperimentTypePickerDialog {...defaultProps} onConfirm={undefined} />);
      const applyButton = screen.getByText('Apply');
      expect(() => fireEvent.click(applyButton)).not.toThrow();
    });

    test('handles missing onClose gracefully', () => {
      const { container } = render(<ExperimentTypePickerDialog {...defaultProps} onClose={undefined} />);
      const backdrop = container.querySelector('.absolute.inset-0');
      expect(() => fireEvent.click(backdrop)).not.toThrow();
    });

    test('maintains selection when re-rendered with same currentTypeId', () => {
      const { rerender } = render(<ExperimentTypePickerDialog {...defaultProps} currentTypeId="diagnostic-multi" />);
      expect(screen.getByText('Diagnostic experiment · multiple tests').closest('button')).toHaveClass('border-blue-500');
      
      rerender(<ExperimentTypePickerDialog {...defaultProps} currentTypeId="diagnostic-multi" />);
      expect(screen.getByText('Diagnostic experiment · multiple tests').closest('button')).toHaveClass('border-blue-500');
    });
  });

  describe('Accessibility', () => {
    test('has proper focus management for keyboard navigation', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      const firstOption = screen.getByText('Diagnostic experiment · single run').closest('button');
      expect(firstOption).toHaveAttribute('type', 'button');
    });

    test('option buttons have visible focus styles', () => {
      render(<ExperimentTypePickerDialog {...defaultProps} />);
      const option = screen.getByText('Diagnostic experiment · single run').closest('button');
      expect(option).toHaveClass('focus-visible:ring-2');
    });
  });
});
