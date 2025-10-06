# Bug Fix: Handle Null ProjectId When All Projects Deleted

## Problem
When deleting all projects, the application would crash with IndexedDB errors:

```
TypeError: Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.
```

This occurred in multiple places:
- `clearTree()` - trying to delete with null projectId
- `saveTree()` - trying to save with null projectId  
- `loadTree()` - trying to load with null projectId
- `useDatasetStore` effects - attempting operations with null projectId

## Root Cause
When the last project is deleted in `deleteProject()`:

```jsx
setCurrentProjectId((cur) => {
  if (cur === id) {
    const remaining = loadFromLocalStorage('globalAppData_projects', []);
    const nextId = (remaining[0] && remaining[0].id) || null;  // ← Returns null when no projects
    saveToLocalStorage('globalAppData_currentProjectId', nextId);
    return nextId;
  }
  return cur;
});
```

The `currentProjectId` becomes `null`, which then propagates to:
1. `useDatasetStore(currentProjectId)` - receives null
2. IndexedDB operations fail because Dexie compound keys require valid values
3. Effects try to persist/load with null projectId → crash

## Solution

Added null checks at **5 critical points** to gracefully handle the "no projects" state:

### 1. `useDatasetStore` - Hydration Effect
**File:** `src/hooks/useDatasetStore.jsx`

```jsx
useEffect(() => {
  let mounted = true;
  setSelectedDataset(null);
  setInitHydrated(false);
  
  // If projectId is null (all projects deleted), skip hydration
  if (!projectId) {
    initLoadedRef.current = true;
    if (mounted) setInitHydrated(true);
    return;  // ← Early return, no IndexedDB operations
  }
  
  // ... rest of hydration logic
}, [projectId]);
```

### 2. `useDatasetStore` - Persistence Effect
**File:** `src/hooks/useDatasetStore.jsx`

```jsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      if (!initHydrated) return;
      // If projectId is null (all projects deleted), skip persistence
      if (!projectId) return;  // ← Early return
      
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
```

### 3. `clearTree` Function
**File:** `src/utils/indexedTreeStore.js`

```javascript
export async function clearTree(projectId = 'default') {
  // If projectId is null or undefined, skip operation (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] clearTree skipped: projectId is null');
    return true;  // ← Return success, no-op
  }
  
  try {
    await db.nodes.where('projectId').equals(projectId).delete();
    return true;
  } catch (err) {
    console.error('[indexedTreeStore] clearTree error', err);
    throw err;
  }
}
```

### 4. `saveTree` Function
**File:** `src/utils/indexedTreeStore.js`

```javascript
export async function saveTree(rootNode, projectId = 'default') {
  if (!rootNode || typeof rootNode !== 'object') throw new Error('rootNode required');
  // If projectId is null or undefined, skip operation (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] saveTree skipped: projectId is null');
    return false;  // ← Return false, no-op
  }
  
  try {
    // ... rest of save logic
  }
}
```

### 5. `loadTree` Function
**File:** `src/utils/indexedTreeStore.js`

```javascript
export async function loadTree(projectId = 'default') {
  // If projectId is null or undefined, return null (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] loadTree skipped: projectId is null');
    return null;  // ← Return null dataset
  }
  
  try {
    const rec = await db.nodes.get({ projectId, path: '' });
    if (!rec) return null;
    const root = decompress(rec.compressed);
    return root;
  } catch (err) {
    console.error('[indexedTreeStore] loadTree error', err);
    throw err;
  }
}
```

### 6. `loadSubtree` Function
**File:** `src/utils/indexedTreeStore.js`

```javascript
export async function loadSubtree(path, projectId = 'default') {
  // If projectId is null or undefined, return null (all projects deleted)
  if (!projectId) {
    console.debug('[indexedTreeStore] loadSubtree skipped: projectId is null');
    return null;  // ← Return null
  }
  
  const p = normPath(path);
  try {
    // ... rest of load logic
  }
}
```

## Behavior After Fix

### When All Projects Are Deleted:
1. `currentProjectId` becomes `null`
2. `useDatasetStore(null)` receives null projectId
3. **Hydration effect:**
   - Immediately sets `selectedDataset = null`
   - Checks `if (!projectId)` → **skips IndexedDB load**
   - Sets `initHydrated = true` (completes successfully)
4. **Persistence effect:**
   - Checks `if (!projectId)` → **skips IndexedDB save**
   - No crash, no error
5. **Result:** App shows "no projects" state gracefully

### When Creating First Project After Deletion:
1. User creates new project → `currentProjectId = newUuid`
2. `useDatasetStore(newUuid)` receives valid projectId
3. Hydration effect runs normally (loads empty dataset from IndexedDB)
4. App works normally

## Debug Logging
All null checks include debug logs (only visible with console debug level):
```javascript
console.debug('[indexedTreeStore] clearTree skipped: projectId is null');
console.debug('[indexedTreeStore] saveTree skipped: projectId is null');
console.debug('[indexedTreeStore] loadTree skipped: projectId is null');
console.debug('[indexedTreeStore] loadSubtree skipped: projectId is null');
```

These help diagnose issues without cluttering production logs.

## Testing Checklist

### Manual Testing
- [x] Delete all projects → no crash ✅
- [x] Create new project after deleting all → works normally ✅
- [x] Delete multiple projects one by one → last deletion doesn't crash ✅
- [x] Switch between projects, then delete all → no crash ✅
- [x] Refresh page with no projects → loads without error ✅

### Edge Cases
- [x] Delete last project while dataset is indexing
- [x] Delete all projects with explorer open
- [x] Delete all projects with modals open
- [x] Rapid create/delete cycles

## Related Issues
This fix complements the previous dataset isolation fix (BUGFIX_DATASET_ISOLATION.md):
- **Previous fix:** Prevented dataset inheritance between projects
- **This fix:** Prevents crashes when no projects exist

## Files Changed
1. `src/hooks/useDatasetStore.jsx` - Added null checks in both effects
2. `src/utils/indexedTreeStore.js` - Added null checks in all 5 public functions

## Performance Impact
- **Minimal:** Null checks are O(1) operations
- **Improved:** Avoids expensive IndexedDB operations when not needed
- **No breaking changes:** Existing code continues to work

## Prevention
To prevent similar issues:
1. **Always validate input parameters** before IndexedDB operations
2. **Handle null/undefined gracefully** in all data layer functions
3. **Return early** with safe defaults rather than throwing
4. **Test edge cases** like "delete all", "empty state", "null IDs"

## Deployment Notes
- No database migrations needed
- No localStorage changes required
- Safe to deploy immediately (backward compatible)
- Users can safely delete all projects without data loss
