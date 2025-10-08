import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ProjectCard from './ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: 'test-123',
    name: 'Test Project',
  };

  const defaultProps = {
    project: mockProject,
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onToggleRename: vi.fn(),
    onDelete: vi.fn(),
    onEditDataset: vi.fn(),
    onDeleteDataset: vi.fn(),
    onExport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders project name', () => {
      render(<ProjectCard {...defaultProps} />);
      expect(screen.getByTestId('project-card-name')).toHaveTextContent('Test Project');
    });

    test('shows active badge when isActive is true', () => {
      render(<ProjectCard {...defaultProps} isActive={true} />);
      expect(screen.getByTestId('project-card-active-badge')).toHaveTextContent('(active)');
    });

    test('does not show active badge when isActive is false', () => {
      render(<ProjectCard {...defaultProps} isActive={false} />);
      expect(screen.queryByTestId('project-card-active-badge')).not.toBeInTheDocument();
    });

    test('applies selected styles when isSelected is true', () => {
      render(<ProjectCard {...defaultProps} isSelected={true} />);
      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass('border-indigo-600', 'bg-indigo-50');
    });

    test('shows dataset name when tree is provided', () => {
      const tree = { rootName: 'My Dataset' };
      render(<ProjectCard {...defaultProps} tree={tree} />);
      expect(screen.getByTestId('project-card-dataset-value')).toHaveTextContent('My Dataset');
    });

    test('shows "None" when no tree is provided', () => {
      render(<ProjectCard {...defaultProps} tree={null} />);
      expect(screen.getByTestId('project-card-dataset-value')).toHaveTextContent('None');
    });

    test('shows loading spinner when loading is true', () => {
      render(<ProjectCard {...defaultProps} loading={true} />);
      expect(screen.getByText('Indexing...')).toBeInTheDocument();
    });

    test('shows test setup name when provided', () => {
      render(<ProjectCard {...defaultProps} setupName="Test Setup A" />);
      expect(screen.getByTestId('project-card-setup-value')).toHaveTextContent('Test Setup A');
    });

    test('shows last edited timestamp when provided', () => {
      const lastEdited = new Date('2025-10-01T10:00:00Z');
      render(<ProjectCard {...defaultProps} lastEdited={lastEdited} />);
      expect(screen.getByTestId('project-card-last-edited')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('calls onSelect when card is clicked', () => {
      render(<ProjectCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('project-card'));
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    test('calls onSelect when Enter key is pressed', () => {
      render(<ProjectCard {...defaultProps} />);
      const card = screen.getByTestId('project-card');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    test('calls onSelect when Space key is pressed', () => {
      render(<ProjectCard {...defaultProps} />);
      const card = screen.getByTestId('project-card');
      fireEvent.keyDown(card, { key: ' ' });
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    test('calls onEditDataset when edit dataset button is clicked', () => {
      render(<ProjectCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('project-card-edit-dataset-btn'));
      expect(defaultProps.onEditDataset).toHaveBeenCalledTimes(1);
    });

    test('calls onDeleteDataset when delete dataset button is clicked', () => {
      render(<ProjectCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('project-card-delete-dataset-btn'));
      expect(defaultProps.onDeleteDataset).toHaveBeenCalledTimes(1);
    });

    test('calls onExport when export button is clicked', () => {
      render(<ProjectCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('project-card-export-btn'));
      expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
    });

    test('calls onToggleRename when rename button is clicked', () => {
      render(<ProjectCard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('project-card-rename-btn'));
      expect(defaultProps.onToggleRename).toHaveBeenCalledTimes(1);
    });

    test('calls onDelete when delete button is clicked (non-default project)', () => {
      render(<ProjectCard {...defaultProps} isDefault={false} />);
      fireEvent.click(screen.getByTestId('project-card-delete-btn'));
      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });

    test('calls onReset when reset button is clicked (default project)', () => {
      const onReset = vi.fn();
      render(<ProjectCard {...defaultProps} isDefault={true} onReset={onReset} />);
      fireEvent.click(screen.getByTestId('project-card-reset-btn'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rename Mode', () => {
    test('shows FormField when isRenaming is true', () => {
      render(<ProjectCard {...defaultProps} isRenaming={true} />);
      // FormField renders an input with name="project-{id}-name"
      const input = screen.getByPlaceholderText('Project name');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', `project-${mockProject.id}-name`);
    });

    test('hides project name text when isRenaming is true', () => {
      render(<ProjectCard {...defaultProps} isRenaming={true} />);
      expect(screen.queryByTestId('project-card-name')).not.toBeInTheDocument();
    });

    test('does not propagate click events from rename input to card', () => {
      render(<ProjectCard {...defaultProps} isRenaming={true} />);
      const input = screen.getByPlaceholderText('Project name');
      fireEvent.click(input);
      expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Progress Overlay', () => {
    test('shows ProgressOverlay when progress is provided', () => {
      const progress = { percent: 50, message: 'Processing...' };
      render(<ProjectCard {...defaultProps} progress={progress} />);
      expect(screen.getByTestId('progress-overlay')).toBeInTheDocument();
    });

    test('does not show ProgressOverlay when progress is null', () => {
      render(<ProjectCard {...defaultProps} progress={null} />);
      expect(screen.queryByTestId('progress-overlay')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles missing optional callbacks gracefully', () => {
      const minimalProps = {
        project: mockProject,
      };
      render(<ProjectCard {...minimalProps} />);
      
      // Should not crash when clicking without handlers
      expect(() => {
        fireEvent.click(screen.getByTestId('project-card'));
      }).not.toThrow();
    });

    test('handles empty project name', () => {
      const emptyProject = { id: 'test-123', name: '' };
      render(<ProjectCard {...defaultProps} project={emptyProject} />);
      expect(screen.getByTestId('project-card-name')).toHaveTextContent('');
    });

    test('handles invalid lastEdited date', () => {
      render(<ProjectCard {...defaultProps} lastEdited={new Date('invalid')} />);
      // Component still renders the last-edited section, but formatDate returns null for invalid dates
      const lastEditedEl = screen.getByTestId('project-card-last-edited');
      expect(lastEditedEl).toBeInTheDocument();
      // The formatted date should be empty (formatDate returns null for invalid dates)
      const dateSpan = lastEditedEl.querySelector('span');
      expect(dateSpan).toHaveTextContent('');
    });
  });

  describe('Accessibility', () => {
    test('has role="button"', () => {
      render(<ProjectCard {...defaultProps} />);
      expect(screen.getByTestId('project-card')).toHaveAttribute('role', 'button');
    });

    test('has tabIndex="0" for keyboard navigation', () => {
      render(<ProjectCard {...defaultProps} />);
      expect(screen.getByTestId('project-card')).toHaveAttribute('tabIndex', '0');
    });

    test('has aria-pressed attribute reflecting selection state', () => {
      const { rerender } = render(<ProjectCard {...defaultProps} isSelected={false} />);
      expect(screen.getByTestId('project-card')).toHaveAttribute('aria-pressed', 'false');
      
      rerender(<ProjectCard {...defaultProps} isSelected={true} />);
      expect(screen.getByTestId('project-card')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
