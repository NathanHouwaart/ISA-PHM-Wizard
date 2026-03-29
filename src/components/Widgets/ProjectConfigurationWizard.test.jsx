import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectConfigurationWizard from './ProjectConfigurationWizard';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { useProjectDataset } from '../../hooks/useProjectDataset';

vi.mock('../../contexts/GlobalDataContext');
vi.mock('../../hooks/useProjectDataset');
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

describe('ProjectConfigurationWizard', () => {
  const mockOnCancel = vi.fn();
  const mockOnComplete = vi.fn();
  const mockRenameProject = vi.fn();
  const mockUpdateType = vi.fn();
  const mockUpdateProjectTestSetupSelection = vi.fn();

  const baseContext = {
    projects: [{ id: 'proj-1', name: 'Existing Project' }],
    renameProject: mockRenameProject,
    updateProjectExperimentType: mockUpdateType,
    updateProjectTestSetupSelection: mockUpdateProjectTestSetupSelection,
  };

  const baseDataset = {
    loading: false,
    tree: { rootName: 'Dataset' },
    progress: null,
    indexDataset: vi.fn(),
    deleteDataset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useProjectData.mockReturnValue(baseContext);
    useProjectActions.mockReturnValue(baseContext);
    useProjectDataset.mockReturnValue(baseDataset);
  });

  const renderWizard = (props = {}) =>
    render(
      <ProjectConfigurationWizard
        open
        projectId="proj-1"
        onCancel={mockOnCancel}
        onComplete={mockOnComplete}
        {...props}
      />
    );

  it('renders when open and projectId provided', () => {
    renderWizard();
    expect(screen.getByText('Configure project')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
  });

  it('does not render when closed or missing projectId', () => {
    const { rerender } = renderWizard({ open: false });
    expect(screen.queryByText('Configure project')).not.toBeInTheDocument();
    rerender(
      <ProjectConfigurationWizard
        open
        projectId={null}
        onCancel={mockOnCancel}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.queryByText('Configure project')).not.toBeInTheDocument();
  });

  it('invokes onCancel when cancel button clicked', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('navigates between steps', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
  });

  it('calls onComplete and persists changes when finishing', () => {
    renderWizard({ initialStep: 3 });
    fireEvent.click(screen.getByText('Finish'));
    expect(mockUpdateType).toHaveBeenCalled();
    expect(mockUpdateProjectTestSetupSelection).toHaveBeenCalledWith('proj-1', null);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
