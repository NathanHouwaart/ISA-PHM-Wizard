# Bug Fix: Dataset Isolation Between Projects

## Problem
When creating a new project (especially after deleting projects), the new project would sometimes inherit the dataset from a previously active project. This violated project isolation and caused confusion.

## Root Cause
The bug had two components:

### 1. Dataset State Persistence in Memory
- `selectedDataset` was managed by `useDatasetStore` hook
- The hook only rehydrated from IndexedDB when `projectId` changed in its dependency array
- However, when switching projects quickly, the old dataset would remain in memory briefly
- The `useEffect` would eventually fire, but there was a window where stale data was visible

### 2. Incomplete Project Switching Logic
- `switchProject()` in `GlobalDataContext` reloaded all localStorage state
- But it didn't explicitly clear the dataset, relying on `useDatasetStore` to handle it
- The comment incorrectly stated "selectedDataset in IndexedDB is currently global"
- In reality, datasets ARE scoped per project in IndexedDB (via `projectId` compound key)

## Solution

### Part 1: Explicit Dataset Clearing in `useDatasetStore`
**File:** `src/hooks/useDatasetStore.jsx`

Added immediate dataset clearing when `projectId` changes:

```jsx
useEffect(() => {
  let mounted = true;
  // Immediately clear the dataset when projectId changes to prevent stale data
  setSelectedDataset(null);
  setInitHydrated(false);
  
  (async () => {
    try {
      const root = await loadTree(projectId);
      if (mounted && root) setSelectedDataset(root);
    } catch (err) {
      console.error('[useDatasetStore] loadTree error', err);
    } finally {
      initLoadedRef.current = true;
      if (mounted) setInitHydrated(true);
    }
  })();
  return () => { mounted = false; };
}, [projectId]);
```

**Benefits:**
- Dataset is immediately cleared when projectId changes (synchronous)
- No window where stale dataset is visible
- `initHydrated` is reset to `false`, signaling loading state to consumers
- Proper cleanup with `mounted` flag prevents state updates after unmount

### Part 2: Updated Documentation in `GlobalDataContext`
**File:** `src/contexts/GlobalDataContext.jsx`

Updated the comment in `switchProject()` to accurately reflect the architecture:

```jsx
// Note: selectedDataset will be reloaded by useDatasetStore when projectId changes.
// The useDatasetStore hook has projectId in its dependency array, so it will:
// 1. Clear the current dataset (setSelectedDataset(null) immediately)
// 2. Load the new project's dataset from IndexedDB
// This ensures each project has its own isolated dataset.
```

## Architecture Summary

### Dataset Storage
- **IndexedDB** (via Dexie): Stores compressed dataset trees with compound key `[projectId, path]`
- **React State**: `selectedDataset` in `useDatasetStore` hook
- **Scoping**: Datasets are isolated per project at the storage layer

### Project Switching Flow
1. User selects new project in `ProjectSessionsModal`
2. `switchProject(newProjectId)` called in `GlobalDataContext`
3. `currentProjectId` state updates
4. `useDatasetStore`'s `useEffect` triggers (dependency: `projectId`)
5. Dataset immediately cleared: `setSelectedDataset(null)`
6. Hydration state reset: `setInitHydrated(false)`
7. Async load from IndexedDB for new project
8. If dataset exists: `setSelectedDataset(loadedDataset)`
9. Hydration complete: `setInitHydrated(true)`

### Data Flow Diagram
```
User Action: Switch to Project B
        ↓
GlobalDataContext.switchProject(projectB_id)
        ↓
setCurrentProjectId(projectB_id)
        ↓
useDatasetStore useEffect triggers
        ↓
setSelectedDataset(null)  ← IMMEDIATE CLEAR
setInitHydrated(false)
        ↓
loadTree(projectB_id) from IndexedDB
        ↓
setSelectedDataset(projectB_dataset)
setInitHydrated(true)
```

## Testing Checklist

### Manual Testing
- [ ] Create Project A, index a dataset
- [ ] Create Project B (new), verify no dataset is associated
- [ ] Switch back to Project A, verify original dataset is still there
- [ ] Delete Project A
- [ ] Create Project C (new), verify no dataset is associated
- [ ] Create multiple projects rapidly, verify each starts with no dataset

### Edge Cases
- [ ] Delete all projects except one, create new project
- [ ] Switch projects while dataset is still indexing
- [ ] Create project, index dataset, delete project, create new project with same name
- [ ] Multiple browser tabs with different projects selected

## Prevention
To prevent similar issues in the future:

1. **Always clear state explicitly** when scoped identifiers (like `projectId`) change
2. **Document state lifecycles** clearly in code comments
3. **Use immediate synchronous clears** before async reloads to prevent stale data
4. **Test project isolation** after any changes to global state management

## Related Files
- `src/contexts/GlobalDataContext.jsx` - Global state provider
- `src/hooks/useDatasetStore.jsx` - Dataset persistence hook
- `src/utils/indexedTreeStore.js` - IndexedDB wrapper with Dexie
- `src/components/Widgets/ProjectSessionsModal.jsx` - Project selection UI

## Performance Impact
- **Negligible**: Clearing state is synchronous and immediate
- **Improved UX**: Users see loading state instead of stale data
- **No breaking changes**: Existing consumers work as before

## Deployment Notes
- No database migrations needed (IndexedDB schema unchanged)
- No localStorage changes required
- Safe to deploy immediately (backward compatible)
