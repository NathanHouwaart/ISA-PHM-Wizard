import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InAppExplorer from './InAppExplorer';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';

vi.mock('../../contexts/GlobalDataContext');

describe('InAppExplorer', () => {
  const loadDatasetSubtree = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectActions.mockReturnValue({ loadDatasetSubtree });
  });

  it('does not lazy-load subtree when folder children are already available in memory', async () => {
    useProjectData.mockReturnValue({
      selectedDataset: {
        rootName: 'Root',
        tree: [
          {
            name: 'folder-a',
            relPath: 'folder-a',
            isDirectory: true,
            childrenLoaded: true,
            children: [
              {
                name: 'subfolder',
                relPath: 'folder-a/subfolder',
                isDirectory: true,
                childrenLoaded: true,
                children: [],
              },
              {
                name: 'file-a.csv',
                relPath: 'folder-a/file-a.csv',
                isDirectory: false,
              },
            ],
          },
        ],
      },
    });

    render(<InAppExplorer onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.doubleClick(screen.getByText('folder-a'));

    await waitFor(() => {
      expect(screen.getByText('subfolder')).toBeInTheDocument();
    });

    expect(loadDatasetSubtree).not.toHaveBeenCalled();
  });

  it('loads subtree when folder is a lazy node without children in memory', async () => {
    useProjectData.mockReturnValue({
      selectedDataset: {
        rootName: 'Root',
        tree: [
          {
            name: 'folder-b',
            relPath: 'folder-b',
            isDirectory: true,
            childrenLoaded: false,
          },
        ],
      },
    });

    loadDatasetSubtree.mockResolvedValue(null);

    render(<InAppExplorer onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.doubleClick(screen.getByText('folder-b'));

    await waitFor(() => {
      expect(loadDatasetSubtree).toHaveBeenCalledWith('folder-b');
    });
  });

  it('shows folder preview with resolved file count and sample paths', async () => {
    useProjectData.mockReturnValue({
      selectedDataset: {
        rootName: 'Root',
        tree: [
          {
            name: 'folder-c',
            relPath: 'folder-c',
            isDirectory: true,
            childrenLoaded: true,
            children: [
              { name: 'a.csv', relPath: 'folder-c/a.csv', isDirectory: false },
              { name: 'b.csv', relPath: 'folder-c/b.csv', isDirectory: false },
            ],
          },
        ],
      },
    });

    render(<InAppExplorer onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByText('folder-c'));

    await waitFor(() => {
      expect(screen.getByText('Preview: 2 files will be assigned.')).toBeInTheDocument();
    });
    expect(screen.getByText('folder-c/a.csv')).toBeInTheDocument();
  });

  it('disables confirm when selected folder resolves to zero files', async () => {
    const onSelect = vi.fn();

    useProjectData.mockReturnValue({
      selectedDataset: {
        rootName: 'Root',
        tree: [
          {
            name: 'empty-folder',
            relPath: 'empty-folder',
            isDirectory: true,
            childrenLoaded: true,
            children: [],
          },
        ],
      },
    });

    render(<InAppExplorer onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('empty-folder'));

    await waitFor(() => {
      expect(screen.getByText('Preview: 0 files will be assigned.')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'OK' });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
