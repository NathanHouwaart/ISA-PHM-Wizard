# Test Setup Conflict Resolution - Implementation Fix

## Problem Summary
When importing a project with a conflicting test setup (same UUID, different content), the conflict resolution flow was broken:

1. **Root Cause**: `importProject()` detected conflicts and returned early **before importing any project data** (nodes, localStorage)
2. **Symptom**: After resolving conflicts, the imported project had no data - it was empty
3. **Impact**: 
   - Imported projects were unusable
   - Test setup references were broken
   - Projects using the same test setup were not updated when choosing "use imported version"

## Solution Implemented

### Changes to `src/utils/indexedTreeStore.js`

Added an `options` parameter to `importProject()`:
```javascript
export async function importProject(pkg, targetProjectId, options = {})
```

**New option:**
- `skipConflictCheck: boolean` - When `true`, skips conflict detection and proceeds directly with import

**Why this works:**
- First call detects conflicts and returns conflict info
- After user resolves conflict, second call with `skipConflictCheck: true` imports the actual data

### Changes to `src/components/Widgets/ProjectSessionsModal.jsx`

Updated `handleConflictResolution()` to:

1. **"Keep Local" resolution:**
   - Calls `importProject(pkg, newProjectId, { skipConflictCheck: true })`
   - Imports project data without modifying the existing test setup
   - Project references the existing test setup by ID

2. **"Use Imported" resolution:**
   - Updates the test setup in global `testSetups` array
   - Updates `localStorage` with new setup
   - Calls `setTestSetups()` to update global context state
   - Calls `importProject(pkg, newProjectId, { skipConflictCheck: true })`
   - All projects using this test setup ID now see the updated version

3. **"Keep Both" resolution:**
   - Creates new test setup with new UUID
   - Adds to global `testSetups` array
   - Updates the imported package to reference new setup ID
   - Updates project's `selectedTestSetupId` in localStorage
   - Calls `importProject(modifiedPkg, newProjectId, { skipConflictCheck: true })`

## Test Scenarios

### Scenario 1: Keep Local Version
**Setup:**
- Project A exists with Test Setup "Motor-v1" (version 1)
- Import Project B with Test Setup "Motor-v1" (version 2, different content)

**Expected Result:**
- ✅ Conflict dialog appears
- ✅ User selects "Keep Your Current Version"
- ✅ Project B is imported with all data (nodes, localStorage)
- ✅ Project B references existing Test Setup v1
- ✅ Project A still uses Test Setup v1 (unchanged)

### Scenario 2: Use Imported Version
**Setup:**
- Project A exists with Test Setup "Motor-v1" (version 1)
- Project C also uses Test Setup "Motor-v1" (version 1)
- Import Project B with Test Setup "Motor-v1" (version 2, different content)

**Expected Result:**
- ✅ Conflict dialog appears
- ✅ User selects "Use Imported Version"
- ✅ Test Setup "Motor-v1" is updated globally to version 2
- ✅ Project B is imported with all data
- ✅ Project B uses Test Setup v2
- ✅ **Project A now sees Test Setup v2** (global update)
- ✅ **Project C now sees Test Setup v2** (global update)

### Scenario 3: Keep Both (Create New)
**Setup:**
- Project A exists with Test Setup "Motor-v1" (version 1)
- Import Project B with Test Setup "Motor-v1" (version 2, different content)

**Expected Result:**
- ✅ Conflict dialog appears
- ✅ User selects "Keep Both (Create New)"
- ✅ New test setup created: "Motor-v1 (imported)" with new UUID
- ✅ Project B is imported with all data
- ✅ Project B references the new test setup
- ✅ Project A still uses original Test Setup v1
- ✅ Both test setups are available in the global list

## Additional Fixes

### Test Setup State Synchronization
Added `setTestSetups([...setups])` calls to ensure the global context state stays in sync with localStorage when test setups are modified.

**Why this matters:**
- Projects using the test setup selector see updates immediately
- No need to reload the app to see changes
- Consistent state across all components

## Verification Steps

1. **Manual Testing:**
   ```powershell
   npm run dev
   ```
   - Create Project A with a test setup
   - Export Project A
   - Modify the test setup (add sensors, change properties)
   - Import the modified project
   - Verify conflict dialog appears
   - Test each resolution option

2. **Check Project Data:**
   - Verify imported project has dataset files (IndexedDB)
   - Verify imported project has localStorage keys
   - Verify selectedTestSetupId is correct

3. **Check Global State:**
   - Open project selector after import
   - Verify test setup list reflects changes
   - For "use-imported": verify other projects see the update

## Code Quality Notes

- ✅ Follows existing patterns (options object for optional behavior)
- ✅ Backward compatible (options defaults to empty object)
- ✅ Proper error handling maintained
- ✅ State synchronization with global context
- ✅ No breaking changes to existing API

## Files Modified

1. `src/utils/indexedTreeStore.js` - Added `options` parameter to `importProject()`
2. `src/components/Widgets/ProjectSessionsModal.jsx` - Fixed conflict resolution to re-import data

## Related Components

- `TestSetupConflictDialog.jsx` - UI for conflict resolution (unchanged)
- `GlobalDataContext.jsx` - Provides `setTestSetups` (no changes needed)
- Test setup hooks - Will automatically see updated data through context
