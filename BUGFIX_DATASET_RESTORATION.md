# Bugfix: Example Project Dataset Not Loading from isa-project-example.json

## Problem
When loading the example project, the dataset tree (file explorer) was not being restored from `isa-project-example.json`. Only localStorage data (studies, contacts, mappings, etc.) was being loaded, but the IndexedDB dataset tree nodes were missing.

## Root Cause
The `isa-project-example.json` file contains two types of data:
1. **localStorage**: JSON strings for studies, contacts, testSetups, mappings, etc.
2. **nodes**: Compressed dataset tree structure for IndexedDB

The code was only restoring localStorage data but not importing the `nodes` array into IndexedDB, leaving the file explorer empty.

## Solution

### Changes Made

#### 1. Import `importProject` Helper
**File**: `src/contexts/GlobalDataContext.jsx`

Added import for `importProject` function from indexedTreeStore:
```javascript
import { clearTree, importProject } from '../utils/indexedTreeStore';
```

#### 2. Added Initial Dataset Restoration on First Load
**File**: `src/contexts/GlobalDataContext.jsx`

Added `useEffect` hook that runs once on mount:
```javascript
useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;

    if (currentProjectId === DEFAULT_PROJECT_ID) {
        import('../utils/indexedTreeStore').then(({ loadTree }) => {
            loadTree(DEFAULT_PROJECT_ID).then((existingTree) => {
                if (!existingTree && isaProjectExample.nodes && isaProjectExample.nodes.length > 0) {
                    importProject({ nodes: isaProjectExample.nodes, localStorage: {} }, DEFAULT_PROJECT_ID)
                        .catch((err) => console.warn('[GlobalDataContext] initial dataset restoration failed', err));
                }
            });
        });
    }
}, []);
```

**Logic**:
- Runs once on component mount (empty dependency array)
- Only applies to example project (`currentProjectId === DEFAULT_PROJECT_ID`)
- Checks if dataset tree already exists in IndexedDB
- If missing, imports nodes from `isa-project-example.json`
- Handles errors gracefully with warnings

#### 3. Updated `resetProject` to Restore Dataset Tree
**File**: `src/contexts/GlobalDataContext.jsx`

Modified the `resetProject` function to restore dataset nodes when resetting the example project:
```javascript
// Clear IndexedDB tree and restore dataset nodes for example project
try {
    clearTree(id);
    // For example project, restore dataset tree from isa-project-example.json
    if (isExampleProject && isaProjectExample.nodes && isaProjectExample.nodes.length > 0) {
        importProject({ nodes: isaProjectExample.nodes, localStorage: {} }, id)
            .catch((err) => console.warn('[GlobalDataContext] resetProject: dataset restoration failed', err));
    }
} catch (e) {
    console.warn('[GlobalDataContext] resetProject: clearTree failed', e);
}
```

**Logic**:
- Clears existing dataset tree first
- For example project only, imports nodes from baseline JSON
- For user projects, leaves dataset empty (as intended)
- Non-blocking async operation with error handling

## Behavior After Fix

### Fresh Incognito Tab (No localStorage, No IndexedDB)
1. App creates example project with ID `'example-project'`
2. Loads localStorage data from `isa-project-example.json`
3. **NEW**: Imports dataset tree nodes into IndexedDB from `isa-project-example.json`
4. File explorer shows example dataset structure immediately

### Resetting Example Project
1. Clears localStorage and writes baseline data back
2. Clears IndexedDB dataset tree
3. **NEW**: Restores dataset tree nodes from `isa-project-example.json`
4. File explorer shows original example dataset after reset

### New User Projects
1. Start with empty localStorage arrays
2. **Unchanged**: No dataset tree imported (empty file explorer)
3. User builds dataset from scratch via file picker

## Technical Details

### importProject Function
- Located in `src/utils/indexedTreeStore.js`
- Takes `{ nodes, localStorage }` package and target project ID
- Writes nodes to IndexedDB with proper project isolation
- Handles compressed dataset tree structure with LZ-String
- Already existed in codebase; we're now using it for baseline restoration

### Dataset Tree Structure in isa-project-example.json
```json
{
  "nodes": [
    {
      "path": "",
      "compressed": "ᯡ࠳䈌...", // LZ-String compressed tree
      "updatedAt": 1759755241484,
      "meta": { "childrenLoaded": true }
    }
  ]
}
```

## Validation

### Manual Testing Steps
1. **Fresh Load Test**:
   - Open incognito window
   - Clear all site data in DevTools
   - Load application
   - Verify file explorer shows dataset tree for example project

2. **Reset Test**:
   - Edit or delete files in example project dataset
   - Click "Reset" button in ProjectSessionsModal
   - Verify dataset tree is restored to original state

3. **New Project Test**:
   - Create new user project
   - Switch to new project
   - Verify file explorer is empty (no dataset)

4. **Switch Test**:
   - Switch between example project and user project
   - Verify dataset appears/disappears correctly

### Expected Results
- ✅ Example project always has dataset tree available
- ✅ Reset restores both localStorage AND dataset tree
- ✅ New projects have empty dataset (as intended)
- ✅ No errors in console during restoration
- ✅ Project switching maintains correct dataset isolation

## Related Files
- `src/contexts/GlobalDataContext.jsx` - Main implementation
- `src/utils/indexedTreeStore.js` - importProject helper
- `src/data/isa-project-example.json` - Baseline data source
- `MIGRATION_EXAMPLE_PROJECT.md` - Overall migration documentation

## Compatibility
- Backward compatible: existing users' datasets preserved
- Migration from old 'default' project ID to 'example-project' unaffected
- No breaking changes to export/import functionality
- Works with existing useDatasetStore hook without modifications
