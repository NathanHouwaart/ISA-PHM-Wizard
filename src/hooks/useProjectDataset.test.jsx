import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProjectDataset } from './useProjectDataset';
import * as indexedTreeStore from '../utils/indexedTreeStore';
import * as useFileSystemModule from './useFileSystem';

// Mock dependencies
vi.mock('../utils/indexedTreeStore', () => ({
  loadTree: vi.fn(),
  saveTree: vi.fn(),
  clearTree: vi.fn(),
}));

vi.mock('./useFileSystem', () => ({
  useFileSystem: vi.fn(),
}));

vi.mock('../contexts/GlobalDataContext', () => ({
  useProjectData: () => ({
    currentProjectId: 'test-project-123',
  }),
  useProjectActions: () => ({
    setSelectedDataset: vi.fn(),
  }),
}));

describe('useProjectDataset', () => {
  const mockProjectId = 'test-project-123';
  const mockTree = {
    rootName: 'TestDataset',
    rootPath: '/path/to/dataset',
    tree: [
      { name: 'file1.txt', relPath: 'file1.txt', isDirectory: false },
      { name: 'folder1', relPath: 'folder1', isDirectory: true, children: [] },
    ],
  };

  let mockFileSystem;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {};
    // @ts-ignore - global is available in test environment
    global.localStorage = {
      getItem: vi.fn((key) => localStorageMock[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
      }),
    };

    // Mock useFileSystem
    mockFileSystem = {
      loading: false,
      progress: null,
      pickAndIndexDirectory: vi.fn(),
      isNativeSupported: vi.fn(() => true),
      reset: vi.fn(),
    };
    useFileSystemModule.useFileSystem.mockReturnValue(mockFileSystem);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads existing dataset from IndexedDB on mount', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(mockTree);

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.tree).toBe(null);

    // Wait for tree to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toEqual(mockTree);
    expect(indexedTreeStore.loadTree).toHaveBeenCalledWith(mockProjectId);
  });

  it('handles loading error gracefully', async () => {
    indexedTreeStore.loadTree.mockRejectedValue(new Error('IndexedDB error'));

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toBe(null);
    expect(result.current.error).toBe(null); // Loading errors don't set error state
  });

  it('indexes new directory successfully', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(null);
    mockFileSystem.pickAndIndexDirectory.mockResolvedValue(mockTree);
    indexedTreeStore.saveTree.mockResolvedValue();

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger indexing
    await act(async () => {
      await result.current.indexDataset();
    });

    expect(mockFileSystem.pickAndIndexDirectory).toHaveBeenCalled();
    expect(indexedTreeStore.saveTree).toHaveBeenCalledWith(mockTree, mockProjectId);
    expect(result.current.tree).toEqual(mockTree);
    expect(result.current.error).toBe(null);
  });

  it('handles user cancellation during indexing', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(null);
    mockFileSystem.pickAndIndexDirectory.mockResolvedValue(null); // User cancelled

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.indexDataset();
    });

    expect(indexedTreeStore.saveTree).not.toHaveBeenCalled();
    expect(result.current.tree).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('handles indexing errors with user-friendly messages', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(null);
    const notAllowedError = new Error('Permission denied');
    notAllowedError.name = 'NotAllowedError';
    mockFileSystem.pickAndIndexDirectory.mockRejectedValue(notAllowedError);

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.indexDataset();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toContain('Permission denied');
    expect(result.current.tree).toBe(null);
  });

  it('tracks progress during indexing', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(null);
    mockFileSystem.pickAndIndexDirectory.mockImplementation(async (progressCallback) => {
      // Simulate progress updates
      progressCallback({ percent: 25, message: 'Scanning files...' });
      progressCallback({ percent: 50, message: 'Indexing...' });
      progressCallback({ percent: 75, message: 'Almost done...' });
      return mockTree;
    });
    indexedTreeStore.saveTree.mockResolvedValue();

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.indexDataset();
    });

    expect(result.current.tree).toEqual(mockTree);
  });

  it('deletes dataset successfully', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(mockTree);
    indexedTreeStore.clearTree.mockResolvedValue();

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tree).toEqual(mockTree);

    // Delete dataset
    await act(async () => {
      await result.current.deleteDataset();
    });

    expect(indexedTreeStore.clearTree).toHaveBeenCalledWith(mockProjectId);
    expect(result.current.tree).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('handles delete errors', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(mockTree);
    indexedTreeStore.clearTree.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteDataset();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toContain('Failed to delete dataset');
  });

  it('clears error state', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(null);
    mockFileSystem.pickAndIndexDirectory.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger error
    await act(async () => {
      await result.current.indexDataset();
    });

    expect(result.current.error).toBeTruthy();

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('loads metadata from localStorage', async () => {
    const testSetupId = 'setup-123';
    const testSetups = [
      { id: 'setup-123', name: 'Test Setup 1' },
      { id: 'setup-456', name: 'Test Setup 2' },
    ];
    const lastEdited = new Date('2024-01-15T10:30:00Z').toISOString();

    localStorage.setItem(`globalAppData_${mockProjectId}_selectedTestSetupId`, JSON.stringify(testSetupId));
    localStorage.setItem('globalAppData_testSetups', JSON.stringify(testSetups));
    localStorage.setItem(`globalAppData_${mockProjectId}_lastEdited`, JSON.stringify(lastEdited));

    indexedTreeStore.loadTree.mockResolvedValue(mockTree);

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metadata.setupName).toBe('Test Setup 1');
    expect(result.current.metadata.lastEdited).toBeInstanceOf(Date);
  });

  it('refreshes metadata when requested', async () => {
    indexedTreeStore.loadTree.mockResolvedValue(mockTree);

    const { result } = renderHook(() => useProjectDataset(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initially no metadata
    expect(result.current.metadata.setupName).toBe(null);

    // Update localStorage
    const testSetupId = 'setup-999';
    const testSetups = [{ id: 'setup-999', name: 'Updated Setup' }];
    localStorage.setItem(`globalAppData_${mockProjectId}_selectedTestSetupId`, JSON.stringify(testSetupId));
    localStorage.setItem('globalAppData_testSetups', JSON.stringify(testSetups));

    // Refresh metadata
    act(() => {
      result.current.refreshMetadata();
    });

    expect(result.current.metadata.setupName).toBe('Updated Setup');
  });
});
