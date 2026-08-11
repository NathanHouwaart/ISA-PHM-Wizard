import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectSessionsModal from './ProjectSessionsModal';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';
import { importProject } from '../../utils/indexedTreeStore';
import {
  commitProjectArchiveImport,
  createProjectArchive,
  readProjectImportFile,
} from '../../utils/projectArchive';

vi.mock('../../contexts/GlobalDataContext', () => ({
  useProjectData: vi.fn(),
  useProjectActions: vi.fn(),
}));

vi.mock('../../utils/indexedTreeStore', () => ({
  exportProject: vi.fn(),
  importProject: vi.fn(),
}));

vi.mock('../../utils/projectArchive', () => ({
  createProjectArchive: vi.fn(),
  getProjectArchiveFileName: vi.fn(() => 'project.zip'),
  readProjectImportFile: vi.fn(),
  commitProjectArchiveImport: vi.fn(),
}));

vi.mock('./IconTooltipButton', () => ({
  default: ({ onClick, tooltipText }) => (
    <button type="button" onClick={onClick}>
      {tooltipText || 'icon-button'}
    </button>
  ),
}));

vi.mock('./TooltipButton', () => ({
  default: ({ onClick, children, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('./ProjectCard', () => ({
  default: ({ project }) => <div data-testid="project-card">{project?.name}</div>,
}));

vi.mock('./TestSetupConflictDialog', () => ({
  default: () => <div data-testid="conflict-dialog">conflict</div>,
}));

vi.mock('./AlertDecisionDialog', () => ({
  default: ({ title, message }) => (
    <div data-testid="alert-dialog">
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('./ProjectConfigurationWizard', () => ({
  default: () => null,
}));

vi.mock('../ProjectConfiguration/ProjectNameDialog', () => ({
  default: () => null,
}));

vi.mock('../ProjectConfiguration/ProjectTemplateDialog', () => ({
  default: () => null,
}));

vi.mock('../ProjectConfiguration/ProjectDatasetDialog', () => ({
  default: () => null,
}));

vi.mock('../ProjectConfiguration/ProjectTestSetupDialog', () => ({
  default: () => null,
}));

describe('ProjectSessionsModal import rollback', () => {
  const mockSwitchProject = vi.fn();
  const mockCreateProject = vi.fn();
  const mockDeleteProject = vi.fn();
  const mockResetProject = vi.fn();
  const mockSetTestSetups = vi.fn();
  const mockFlushProjectState = vi.fn();

  const baseProjectData = {
    projects: [{ id: 'example-single-run', name: 'Single Run Sietze' }],
    currentProjectId: 'example-single-run',
    DEFAULT_PROJECT_ID: 'example-single-run',
    MULTI_RUN_EXAMPLE_PROJECT_ID: 'example-multi-run',
  };

  const baseProjectActions = {
    switchProject: mockSwitchProject,
    createProject: mockCreateProject,
    deleteProject: mockDeleteProject,
    resetProject: mockResetProject,
    setTestSetups: mockSetTestSetups,
    flushProjectState: mockFlushProjectState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectData.mockReturnValue(baseProjectData);
    useProjectActions.mockReturnValue(baseProjectActions);
    mockDeleteProject.mockReturnValue(true);
    readProjectImportFile.mockImplementation(async (file) => ({
      project: JSON.parse(await file.text()),
      attachments: [],
      legacy: true,
    }));
  });

  const triggerImport = (container, payload) => {
    const fileInput = container.querySelector('input[type="file"]');
    const file = {
      name: 'import.json',
      text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
    };
    fireEvent.change(fileInput, { target: { files: [file] } });
  };

  it('rolls back created project when import throws', async () => {
    mockCreateProject.mockReturnValue('new-project-id');
    importProject.mockRejectedValue(new Error('Import exploded'));

    const { container } = render(<ProjectSessionsModal onClose={vi.fn()} />);

    triggerImport(container, {
      projectId: 'source-project',
      projectName: 'Imported project',
      nodes: [],
      localStorage: {},
    });

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(importProject).toHaveBeenCalledWith(expect.any(Object), 'new-project-id');
    });
    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith('new-project-id');
    });
    await waitFor(() => {
      expect(screen.getByText('Unable to import project')).toBeInTheDocument();
    });
  });

  it('does not roll back when import returns conflict', async () => {
    mockCreateProject.mockReturnValue('new-project-id');
    importProject.mockResolvedValue({
      success: false,
      targetProjectId: 'new-project-id',
      conflict: {
        setupId: 'setup-1',
        local: { setup: {} },
        imported: { setup: {} },
      },
    });

    const { container } = render(<ProjectSessionsModal onClose={vi.fn()} />);

    triggerImport(container, {
      projectId: 'source-project',
      projectName: 'Imported project',
      nodes: [],
      localStorage: {},
      selectedTestSetup: { id: 'setup-1', name: 'Setup' },
    });

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(importProject).toHaveBeenCalledWith(expect.any(Object), 'new-project-id');
    });
    expect(mockDeleteProject).not.toHaveBeenCalled();
    expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
  });

  it('imports ZIP candidates through the transactional archive path', async () => {
    mockCreateProject.mockReturnValue('new-project-id');
    const project = {
      projectId: 'source-project',
      projectName: 'ZIP project',
      nodes: [],
      localStorage: {},
      selectedTestSetup: null,
    };
    readProjectImportFile.mockResolvedValueOnce({ project, attachments: [], legacy: false });
    commitProjectArchiveImport.mockResolvedValueOnce({ success: true, targetProjectId: 'new-project-id' });

    const { container } = render(<ProjectSessionsModal onClose={vi.fn()} />);
    triggerImport(container, project);

    await waitFor(() => {
      expect(commitProjectArchiveImport).toHaveBeenCalledWith(
        { project, attachments: [], legacy: false },
        'new-project-id'
      );
    });
    expect(importProject).not.toHaveBeenCalled();
    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  it('flushes buffered state before exporting a project archive', async () => {
    createProjectArchive.mockRejectedValueOnce(new Error('Stop after export read'));

    render(<ProjectSessionsModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export project' }));

    await waitFor(() => {
      expect(createProjectArchive).toHaveBeenCalledWith(
        'example-single-run',
        { projectName: 'Single Run Sietze' }
      );
    });
    expect(mockFlushProjectState).toHaveBeenCalledTimes(1);
    expect(mockFlushProjectState.mock.invocationCallOrder[0])
      .toBeLessThan(createProjectArchive.mock.invocationCallOrder[0]);
  });
});
