import { useState, useCallback } from 'react';
import { directoryOpen } from 'browser-fs-access';

/**
 * Custom hook for file system operations with support for large datasets (100k+ files).
 * 
 * @description
 * Provides a unified interface for directory selection and indexing across browsers.
 * Automatically chooses the best method:
 * - Chromium (Chrome/Edge/Opera): Native File System Access API (handles 100k+ files)
 * - Firefox/Safari: browser-fs-access library (more compatible)
 * 
 * The returned dataset.tree contains the CONTENTS of the selected root folder,
 * not the root folder itself. This ensures consistent behavior across browsers
 * (Firefox with browser-fs-access and Chrome with native API both show contents directly).
 * 
 * @example
 * ```jsx
 * const fileSystem = useFileSystem();
 * 
 * async function handlePick() {
 *   const dataset = await fileSystem.pickAndIndexDirectory((progress) => {
 *     console.log('Progress:', progress);
 *   });
 *   
 *   if (dataset) {
 *     console.log('Indexed:', dataset.rootName, dataset.tree.length, 'items');
 *   }
 * }
 * 
 * return (
 *   <button onClick={handlePick} disabled={fileSystem.loading}>
 *     {fileSystem.loading ? `${fileSystem.progress.percent}%` : 'Select Folder'}
 *   </button>
 * );
 * ```
 * 
 * @returns {Object} Hook interface
 * @returns {boolean} loading - Whether indexing is in progress
 * @returns {Object} progress - Current progress state {percent: number, message: string}
 * @returns {Function} pickAndIndexDirectory - Open picker and index selected directory
 * @returns {boolean} isNativeSupported - Whether native File System Access API is available
 * @returns {Function} reset - Reset loading and progress state
 * 
 * @see useFileSystem.DESIGN.md for detailed documentation
 * @see useFileSystem.test.jsx for usage examples and edge cases
 */
export function useFileSystem() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });

  /**
   * Check if native File System Access API is supported
   */
  const isNativeSupported = useCallback(() => {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }, []);

  /**
   * Count total entries in a directory handle (for progress calculation)
   */
  const countEntries = useCallback(async (handle) => {
    let total = 0;
    try {
      for await (const [, h] of handle.entries()) {
        total += 1;
        if (h.kind === 'directory') {
          try {
            total += await countEntries(h);
          } catch (err) {
            // Skip directories we can't access
          }
        }
      }
    } catch (err) {
      console.warn('[useFileSystem] Error counting entries:', err);
    }
    return total;
  }, []);

  /**
   * Walk directory tree incrementally using native File System Access API
   */
  const walkDirectoryNative = useCallback(async (handle, prefix = '', onProgress = () => {}) => {
    const entries = [];
    try {
      for await (const [name, h] of handle.entries()) {
        try {
          const relPath = prefix ? `${prefix}/${name}` : name;

          if (h.kind === 'directory') {
            // Recursively walk subdirectories with error handling
            try {
              const children = await walkDirectoryNative(h, relPath, onProgress);
              entries.push({ name, relPath, isDirectory: true, children });
            } catch (dirErr) {
              console.warn(`[useFileSystem] Skipping directory ${relPath}:`, dirErr);
              // Add empty directory entry instead of failing
              entries.push({ name, relPath, isDirectory: true, children: [] });
            }
          } else {
            // Add file entry
            entries.push({ name, relPath, isDirectory: false });
          }

          // Report progress increment
          try {
            onProgress({ processed: 1 });
          } catch (e) {
            // Ignore progress callback errors
          }
        } catch (entryErr) {
          console.warn(`[useFileSystem] Skipping entry ${name}:`, entryErr);
          // Continue to next entry
        }
      }
    } catch (err) {
      console.warn('[useFileSystem] Error walking directory:', err);
      // Return what we have so far instead of failing completely
    }
    return sortNodes(entries);
  }, []);

  /**
   * Index directory using browser-fs-access (for all browsers)
   */
  const indexDirectoryFallback = useCallback(async (onProgress = () => {}) => {
    try {
      setProgress({ percent: 0, message: 'Opening directory picker...' });
      
      const files = await directoryOpen({ 
        recursive: true,
        mode: 'read'
      });

      if (!files || files.length === 0) {
        return null;
      }

      const rootName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : 'Root';
      const total = files.length;

      setProgress({ percent: 5, message: `Preparing to index ${total.toLocaleString()} files...` });

      const nodesByPath = new Map();
      nodesByPath.set('', { children: [] });

      let processed = 0;
      const BATCH_SIZE = 500;
      const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

      // Process files in batches
      for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
        
        for (let i = batchStart; i < batchEnd; i++) {
          try {
            const f = files[i];
            const rel = f.webkitRelativePath || f.name;
            const parts = rel.split('/');
            
            // Skip the first part (root folder name) to avoid extra nesting level
            const partsWithoutRoot = parts.slice(1);
            if (partsWithoutRoot.length === 0) continue; // Skip if only root folder
            
            let path = '';
            
            for (let j = 0; j < partsWithoutRoot.length; j++) {
              const name = partsWithoutRoot[j];
              const relPath = path ? `${path}/${name}` : name;
              if (!nodesByPath.has(relPath)) {
                nodesByPath.set(relPath, { 
                  name, 
                  relPath, 
                  isDirectory: j < partsWithoutRoot.length - 1, 
                  children: [] 
                });
                const parentPath = path;
                const parent = nodesByPath.get(parentPath);
                if (parent) parent.children.push(nodesByPath.get(relPath));
              }
              path = relPath;
            }
            processed += 1;

            // Report progress (without specific file path)
            onProgress({ processed: 1 });
          } catch (fileErr) {
            console.warn('[useFileSystem] Skipping file due to error:', fileErr);
            processed += 1;
          }
        }

        // Update progress with count only
        const percent = Math.round((processed / total) * 100);
        setProgress({ 
          percent, 
          message: `Indexed ${processed.toLocaleString()} of ${total.toLocaleString()} files` 
        });

        await yieldToMain();
      }

      setProgress({ percent: 95, message: 'Organizing file tree...' });
      await yieldToMain();

      const tree = (nodesByPath.get('')?.children || []).map((n) => n);
      return { rootName, tree: sortNodes(tree) };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled
        return null;
      }
      throw err;
    }
  }, []);

  /**
   * Index directory using native File System Access API (preferred for large datasets)
   */
  const indexDirectoryNative = useCallback(async (onProgress = () => {}) => {
    try {
      setProgress({ percent: 0, message: 'Opening directory picker...' });
      
      const rootHandle = await window.showDirectoryPicker();
      if (!rootHandle) return null;

      let rootName = 'Root';
      try {
        rootName = rootHandle.name || 'Root';
      } catch (err) {
        console.warn('[useFileSystem] Could not get root name:', err);
      }

      setProgress({ percent: 5, message: 'Counting items...' });

      let total = 0;
      try {
        total = await countEntries(rootHandle);
      } catch (err) {
        console.warn('[useFileSystem] Error counting entries:', err);
        total = 1;
      }

      let processed = 0;
      const progressCallback = ({ current, processed: p = 0 }) => {
        if (p) {
          processed += p;
          const percent = Math.min(95, Math.round((processed / Math.max(1, total)) * 100));
          setProgress({ 
            percent, 
            message: `Indexed ${processed.toLocaleString()} of ${total.toLocaleString()} files` 
          });
          onProgress({ processed: p });
        }
      };

      const tree = await walkDirectoryNative(rootHandle, '', progressCallback);

      return { rootName, tree };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled
        return null;
      }
      throw err;
    }
  }, [countEntries, walkDirectoryNative]);

  /**
   * Main function to pick and index a directory
   * Uses native API for Chromium (better for 100k+ files), browser-fs-access for others
   */
  const pickAndIndexDirectory = useCallback(async (onProgress = () => {}) => {
    setLoading(true);
    setProgress({ percent: 0, message: '' });

    try {
      let dataset;

      // Use native API for Chromium browsers (handles large datasets better)
      // Use browser-fs-access for Firefox and others (more compatible)
      if (isNativeSupported()) {
        console.log('[useFileSystem] Using native File System Access API (Chromium)');
        try {
          dataset = await indexDirectoryNative(onProgress);
        } catch (nativeErr) {
          console.warn('[useFileSystem] Native API failed, falling back to browser-fs-access', nativeErr);
          // Fallback to browser-fs-access if native API fails
          dataset = await indexDirectoryFallback(onProgress);
        }
      } else {
        console.log('[useFileSystem] Using browser-fs-access (non-Chromium)');
        dataset = await indexDirectoryFallback(onProgress);
      }

      if (!dataset) {
        // User cancelled
        return null;
      }

      // Show completion
      setProgress({ percent: 100, message: 'Indexing complete!' });
      
      // Keep completion message briefly
      setTimeout(() => {
        setProgress({ percent: 0, message: '' });
      }, 1200);

      return dataset;
    } catch (err) {
      console.error('[useFileSystem] Error indexing directory:', err);
      throw err;
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1200);
    }
  }, [isNativeSupported, indexDirectoryNative, indexDirectoryFallback]);

  /**
   * Reset progress and loading state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setProgress({ percent: 0, message: '' });
  }, []);

  return {
    loading,
    progress,
    pickAndIndexDirectory,
    isNativeSupported: isNativeSupported(),
    reset
  };
}

/**
 * Sort nodes alphabetically with directories first
 */
function sortNodes(nodes) {
  return nodes
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return (a.name || '').localeCompare(b.name || '');
    })
    .map((n) => (n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n));
}
