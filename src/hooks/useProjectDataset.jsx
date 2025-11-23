import { useState, useEffect, useCallback } from 'react';
import { loadTree, clearTree, saveTree } from '../utils/indexedTreeStore';
import { useFileSystem } from './useFileSystem';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import {
  ensureProjectDatasetStats,
  setProjectDatasetStats,
  clearProjectDatasetStats,
  setProjectDatasetName,
  clearProjectDatasetName
} from '../utils/projectMetadata';
/**
 * Custom hook for managing dataset operations for a single project.
 * 
 * @description
 * Encapsulates all dataset-related operations including:
 * - Loading existing datasets from IndexedDB
 * - Indexing new directories via file system picker
 * - Deleting datasets
 * - Progress tracking during indexing
 * - Error handling with user-friendly messages
 * - Project metadata (test setup, last edited)
 * 
 * This hook separates dataset business logic from UI components,
 * making it reusable, testable, and maintainable.
 * 
 * @example
 * ```jsx
 * // Single project usage
 * const MyComponent = ({ projectId }) => {
 *   const dataset = useProjectDataset(projectId);
 *   
 *   return (
 *     <div>
 *       {dataset.loading && <div>Loading... {dataset.progress?.percent}%</div>}
 *       {dataset.error && <ErrorBanner error={dataset.error} />}
 *       {dataset.tree && <div>Dataset: {dataset.tree.rootName}</div>}
 *       
 *       <button onClick={dataset.indexDataset}>Index Dataset</button>
 *       <button onClick={dataset.deleteDataset}>Delete Dataset</button>
 *     </div>
 *   );
 * };
 * 
 * // Multiple projects usage (e.g., in ProjectSessionsModal)
 * const datasets = useProjectDatasets(projects);
 * // Access via: datasets[projectId].tree, datasets[projectId].loading, etc.
 * ```
 * 
 * @param {string} projectId - The project ID to manage dataset for
 * @returns {Object} Dataset management interface
 * @returns {Object|null} tree - The indexed dataset tree (null if not indexed)
 * @returns {boolean} loading - Whether an operation is in progress
 * @returns {Object|null} progress - Current progress {percent: number, message: string}
 * @returns {Error|null} error - Any error that occurred during operations
 * @returns {Object} metadata - Project metadata {setupName: string|null, lastEdited: Date|null}
 * @returns {Function} indexDataset - Pick and index a directory for this project
 * @returns {Function} deleteDataset - Remove indexed dataset
 * @returns {Function} clearError - Clear error state
 * @returns {Function} refreshMetadata - Reload metadata from localStorage
 * @returns {Function} refreshDataset - Reload both tree and metadata from storage
 * 
 * @see useProjectDatasets for managing multiple projects simultaneously
 */
export function useProjectDataset(projectId) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({ setupName: null, lastEdited: null });
  
  const fileSystem = useFileSystem();
  const { currentProjectId, setSelectedDataset } = useGlobalDataContext();

  /**
   * Load project metadata from localStorage
   * Includes test setup name and last edited timestamp
   */
  const loadMetadata = useCallback(() => {
    if (!projectId) {
      setMetadata({ setupName: null, lastEdited: null });
      return;
    }
    try {
      // Load test setup name
      const setupIdRaw = localStorage.getItem(`globalAppData_${projectId}_selectedTestSetupId`);
      const setupId = setupIdRaw ? JSON.parse(setupIdRaw) : null;
      let setupName = null;
      
      if (setupId) {
        const setupsRaw = localStorage.getItem(`globalAppData_testSetups`);
        const setups = setupsRaw ? JSON.parse(setupsRaw) : null;
        if (Array.isArray(setups)) {
          const s = setups.find((x) => x.id === setupId);
          setupName = s ? s.name : null;
        }
      }
      
      // Load last edited timestamp
      const lastEditedRaw = localStorage.getItem(`globalAppData_${projectId}_lastEdited`);
      let lastEdited = null;
      if (lastEditedRaw) {
        try { 
          lastEdited = new Date(JSON.parse(lastEditedRaw)); 
        } catch {
          try { 
            lastEdited = new Date(lastEditedRaw); 
          } catch { 
            lastEdited = null; 
          } 
        }
      }
      
      setMetadata({ setupName, lastEdited });
    } catch (err) {
      console.error('[useProjectDataset] Error loading metadata for project', projectId, err);
      setMetadata({ setupName: null, lastEdited: null });
    }
  }, [projectId]);

  /**
   * Load dataset tree from IndexedDB on mount and when projectId changes
   */
  useEffect(() => {
    let mounted = true;

    if (!projectId) {
      setTree(null);
      setCachedDatasetName(null);
      setLoading(false);
      setProgress(null);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        setLoading(true);
        const loadedTree = await loadTree(projectId);
        if (mounted) {
          setTree(loadedTree);
          if (loadedTree) {
            setProjectDatasetName(projectId, loadedTree.rootName || loadedTree.name || null);
            ensureProjectDatasetStats(projectId, loadedTree);
          } else {
            clearProjectDatasetName(projectId);
            clearProjectDatasetStats(projectId);
          }
        }
      } catch (err) {
        console.error('[useProjectDataset] Error loading tree for project', projectId, err);
        if (mounted) {
          setTree(null);
          clearProjectDatasetName(projectId);
          clearProjectDatasetStats(projectId);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    loadMetadata();

    return () => {
      mounted = false;
    };
  }, [projectId, loadMetadata]);

  /**
   * Sync file system hook progress to local progress state
   */
  useEffect(() => {
    if (loading && fileSystem.progress) {
      setProgress(fileSystem.progress);
    }
  }, [fileSystem.progress, loading]);

  /**
   * Pick a directory and index it for this project
   * Shows progress and handles errors gracefully
   */
  const indexDataset = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress({ percent: 0, message: 'Starting...' });

      console.log('[useProjectDataset] Starting directory indexing for project:', projectId);
      const indexStartTime = performance.now();

      // Use the file system hook to pick and index the directory
      const dataset = await fileSystem.pickAndIndexDirectory((progressUpdate) => {
        if (progressUpdate) {
          setProgress(progressUpdate);
        }
      });

      if (!dataset) {
        console.log('[useProjectDataset] User cancelled directory picker');
        setLoading(false);
        setProgress(null);
        return;
      }

      // Save to IndexedDB
      setProgress({ percent: 98, message: 'Saving to database...' });

      const saveStartTime = performance.now();
      await saveTree(dataset, projectId);
      const saveEndTime = performance.now();
      const saveDuration = ((saveEndTime - saveStartTime) / 1000).toFixed(2);

      const indexEndTime = performance.now();
      const totalIndexDuration = ((indexEndTime - indexStartTime) / 1000).toFixed(2);

      console.log(`[useProjectDataset] IndexedDB save completed in ${saveDuration}s`);
      console.log(`[useProjectDataset] Total indexing time: ${totalIndexDuration}s`);

      // Update state
      setTree(dataset);
      setProjectDatasetName(projectId, dataset?.rootName || dataset?.name || null);
      setProjectDatasetStats(projectId, dataset);

      // If this is the currently active project, update the global selectedDataset
      if (projectId === currentProjectId) {
        console.log('[useProjectDataset] Updating selectedDataset for active project');
        setSelectedDataset(dataset);
      }

      // Mark complete
      setProgress({ percent: 100, message: 'Indexing complete!' });

      // Clear progress after a short delay
      setTimeout(() => {
        setProgress(null);
      }, 1200);

    } catch (err) {
      console.error('[useProjectDataset] pick/index error', err);
      console.error('[useProjectDataset] Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });

      let errorMessage;
      if (err && err.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please grant access to the folder.';
      } else if (err && err.name === 'NotFoundError') {
        errorMessage = 'The operation was canceled by the browser.\n\nThis can happen with very large folders in Chrome. Try:\n• Selecting a smaller folder\n• Using Firefox instead (better for large datasets)\n• Closing other browser tabs to free memory\n• Restarting your browser';
      } else if (err && err.name === 'AbortError') {
        errorMessage = 'Operation was cancelled.';
      } else {
        errorMessage = `Failed to index folder: ${err && err.message}`;
      }

      setError(new Error(errorMessage));
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, fileSystem, currentProjectId, setSelectedDataset]);

  /**
   * Delete the dataset for this project
   * Removes from IndexedDB and clears in-memory state
   */
  const deleteDataset = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await clearTree(projectId);

      // If currently active project, clear in-memory selectedDataset
      if (currentProjectId === projectId) {
        try {
          setSelectedDataset(null);
        } catch (e) {
          console.warn('[useProjectDataset] Error clearing selectedDataset:', e);
        }
      }

      setTree(null);
      clearProjectDatasetName(projectId);
      clearProjectDatasetStats(projectId);
      clearProjectDatasetStats(projectId);
      console.log('[useProjectDataset] Dataset deleted for project:', projectId);

    } catch (err) {
      console.error('[useProjectDataset] delete dataset error', err);
      setError(new Error(`Failed to delete dataset: ${err && err.message}`));
    } finally {
      setLoading(false);
    }
  }, [projectId, currentProjectId, setSelectedDataset]);

  /**
   * Clear error state
   */
  const clearErrorState = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh metadata from localStorage
   * Useful after external changes to test setup or last edited
   */
  const refreshMetadata = useCallback(() => {
    loadMetadata();
  }, [loadMetadata]);

  /**
   * Refresh both tree and metadata from storage
   * Useful after external changes like project reset
   */
  const refreshDataset = useCallback(async () => {
    try {
      setLoading(true);
      const loadedTree = await loadTree(projectId);
      setTree(loadedTree);
      loadMetadata();
      if (loadedTree) {
        setProjectDatasetName(projectId, loadedTree.rootName || loadedTree.name || null);
        setProjectDatasetStats(projectId, loadedTree);
      } else {
        clearProjectDatasetName(projectId);
        clearProjectDatasetStats(projectId);
      }
    } catch (err) {
      console.error('[useProjectDataset] Error refreshing dataset for project', projectId, err);
      setTree(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, loadMetadata]);

  return {
    tree,
    loading,
    progress,
    error,
    metadata,
    indexDataset,
    deleteDataset,
    clearError: clearErrorState,
    refreshMetadata,
    refreshDataset,
  };
}
