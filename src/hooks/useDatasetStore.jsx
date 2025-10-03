import { useEffect, useRef, useState } from 'react';
import { saveTree, loadTree, loadSubtree, clearTree } from '../utils/indexedTreeStore';

// Hook that manages selectedDataset persistence in IndexedDB and provides
// helper to lazy-load and merge subtrees into the in-memory dataset.
export default function useDatasetStore(projectId = 'default') {
  const [selectedDataset, setSelectedDataset] = useState(null);
  // Expose hydration status as state so consumers can react when it completes
  const [initHydrated, setInitHydrated] = useState(false);
  const initLoadedRef = useRef(false);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const root = await loadTree(projectId);
        if (mounted && root) setSelectedDataset(root);
      } catch (err) {
        console.error('[useDatasetStore] loadTree error', err);
      } finally {
        initLoadedRef.current = true;
        // update state to notify consumers that hydration finished
        setInitHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // Persist to IndexedDB when selectedDataset changes (but not before initial hydration)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!initHydrated) return;
        if (!selectedDataset) {
          await clearTree(projectId);
          return;
        }
        await saveTree(selectedDataset, projectId);
      } catch (err) {
        if (!cancelled) console.error('[useDatasetStore] saveTree error', err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDataset, initHydrated, projectId]);

  // merge helper: given a loaded node, merge it into the existing selectedDataset
  async function loadDatasetSubtree(path) {
    try {
    const node = await loadSubtree(path, projectId);
      if (!node) return null;

      setSelectedDataset((prev) => {
        if (!prev) return prev;
        // shallow clone
        const cloned = { ...prev };

        function mergeInto(nodes) {
          if (!Array.isArray(nodes)) return false;
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.relPath === node.relPath) {
              nodes[i] = node;
              return true;
            }
            if (n.isDirectory && mergeInto(n.children || [])) return true;
          }
          return false;
        }

        if (node.relPath === '' || node.relPath === (prev.rootName || '')) {
          // replacing root
          return node;
        }
        mergeInto(cloned.tree || []);
        return cloned;
      });

      return node;
    } catch (err) {
      console.error('[useDatasetStore] loadDatasetSubtree error', err);
      throw err;
    }
  }

  return {
    selectedDataset,
    setSelectedDataset,
    loadDatasetSubtree,
    // expose a flag for callers that may want to know whether initial hydration finished
    initHydrated: initHydrated
  };
}
