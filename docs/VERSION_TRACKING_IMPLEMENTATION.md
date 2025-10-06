# Test Setup Version Tracking Implementation

## Overview
This document describes the implementation of version tracking for test setups to prevent conflicts when projects are imported/exported across different machines.

## Problem Statement
When a project with a test setup is exported from PC A and imported on PC B, conflicts can occur if:
- Both PCs have the same test setup (same UUID)
- The test setup has been modified on both machines
- The imported version would silently be ignored, causing mapping mismatches and broken grids

## Solution Architecture

### 1. Version Tracking Fields
Every test setup now includes:
- **`version`**: Integer starting at 1, auto-incremented on each modification
- **`lastModified`**: Timestamp of the last modification

**Location**: 
- `src/data/InitialTestSetups.json` - Default test setups seeded with version: 1
- All test setups in localStorage receive these fields via migration

### 2. Automatic Version Increment
**File**: `src/hooks/useTestSetups.jsx`

The `useTestSetups` hook wraps `setTestSetups` to automatically:
- Detect when test setup content changes (via JSON comparison)
- Increment version number
- Update lastModified timestamp
- Ensure new test setups get version fields (default to v1)

This happens transparently - components using `setItems` from the hook automatically get version tracking.

### 3. Migration for Existing Data
**File**: `src/contexts/GlobalDataContext.jsx` (lines ~106-120)

On first load after the update:
- Checks all test setups for missing version/lastModified fields
- Adds version: 1 and lastModified: Date.now() to any setup without them
- Runs once on component mount

### 4. Conflict Detection on Import
**File**: `src/utils/indexedTreeStore.js` - `importProject()` function

When importing a project:
1. **Before** importing anything, checks if imported test setup UUID exists locally
2. Compares versions and lastModified timestamps
3. If mismatch detected:
   - Returns `{ success: false, conflict: {...} }` with details
   - Does NOT modify any data
4. If no conflict:
   - Proceeds with normal import
   - Returns `{ success: true, targetProjectId }`

**Conflict object structure**:
```javascript
{
  setupId: "uuid-of-conflicted-setup",
  setupName: "Test Setup Name",
  local: {
    version: 3,
    lastModified: 1696550400000,
    setup: { ...full local test setup object }
  },
  imported: {
    version: 2,
    lastModified: 1696540000000,
    setup: { ...full imported test setup object }
  }
}
```

### 5. Conflict Resolution UI
**File**: `src/components/Widgets/TestSetupConflictDialog.jsx`

New modal dialog component (following use-components.prompt.md guidelines):
- Uses `Heading3`, `Paragraph`, `TooltipButton` from existing components
- Shows side-by-side comparison of local vs imported versions
- Provides 3 resolution options:

#### Option 1: Keep Your Current Version
- Discards imported test setup
- Project uses existing local version
- No changes to test setups list

#### Option 2: Use Imported Version
- Replaces local test setup with imported version
- Updates all projects using this test setup
- Version incremented automatically

#### Option 3: Keep Both (Create New)
- Creates new test setup with new UUID
- Imported version added as separate entry
- Imported project references the new UUID
- Name appended with " (imported)"

**Cancel button**: Deletes the partially-created project and closes dialog.

### 6. Integration in ProjectSessionsModal
**File**: `src/components/Widgets/ProjectSessionsModal.jsx`

**Changes**:
- Added state: `pendingImport` to store conflict info
- Modified `handleImportFile()`:
  - Calls `importProject()` and checks for conflict
  - If conflict detected, shows `TestSetupConflictDialog`
  - If no conflict, completes import normally
- New `handleConflictResolution()`:
  - Implements the 3 resolution strategies
  - Updates localStorage accordingly
  - Completes import after resolution
- New `completeImport()`:
  - Shared logic for finishing import after conflict resolution
  - Reloads test setups from localStorage
  - Updates UI state

## User Workflow

### Scenario: Import with Conflict
1. User clicks "Import project" in ProjectSessionsModal
2. Selects project JSON file
3. System detects version conflict
4. **TestSetupConflictDialog appears** showing:
   - Test setup name
   - Local version info (version #, last modified date)
   - Imported version info (version #, last modified date)
   - 3 resolution buttons
5. User selects resolution strategy
6. System applies resolution
7. Import completes
8. ProjectSessionsModal shows imported project ready to rename/select

### Scenario: Import without Conflict
1. User clicks "Import project"
2. Selects project JSON file
3. System checks - no conflict or test setup doesn't exist locally
4. Import completes immediately
5. ProjectSessionsModal shows imported project

## Technical Notes

### Why Version Numbers vs Content Hashing?
**Decision**: Use simple integer versions + timestamps

**Rationale**:
- Simpler to implement and debug
- Easier for users to understand ("Version 3 vs Version 2")
- Timestamps provide additional context
- Sufficient for typical use cases (single user, 2-3 machines)
- Can upgrade to content hashing later if needed

**Trade-offs**:
- Doesn't detect identical content with different versions
- Relies on sequential editing (no true branching/merging)
- Good enough for this use case (not Git-level complexity)

### Version Increment Trigger
Versions increment when:
- Test setup JSON representation changes (deep comparison)
- This includes: name, location, description, sensors, characteristics

Versions do NOT increment when:
- Just reading/displaying test setup
- Switching projects
- Exporting/importing unchanged data

### localStorage Keys
- Global test setups: `globalAppData_testSetups` (array)
- Per-project selected setup: `globalAppData_{projectId}_selectedTestSetupId` (string UUID)

### Migration Safety
The migration effect:
- Runs only once per browser session (on GlobalDataContext mount)
- Checks existing version fields before modifying
- Uses nullish coalescing (??) to avoid overwriting valid 0 values
- Returns original array if no changes needed (React optimization)

## Files Modified

1. `src/data/InitialTestSetups.json` - Added version/lastModified to defaults
2. `src/hooks/useTestSetups.jsx` - Wrapped setItems with version tracking
3. `src/contexts/GlobalDataContext.jsx` - Added migration effect
4. `src/utils/indexedTreeStore.js` - Added conflict detection to importProject
5. `src/components/Widgets/TestSetupConflictDialog.jsx` - NEW: Conflict resolution UI
6. `src/components/Widgets/ProjectSessionsModal.jsx` - Integrated conflict dialog

## Testing Recommendations

### Manual Test Cases

**Test 1: New Test Setup**
1. Create new test setup on PC A
2. Export project
3. Import on PC B
4. ✅ Should import without conflict (UUID doesn't exist locally)

**Test 2: Unmodified Test Setup**
1. Create project with test setup on PC A
2. Export project
3. Import same project on PC A (same machine)
4. ✅ Should import without conflict (versions match)

**Test 3: Modified Test Setup - Keep Local**
1. Create project with test setup on PC A, export
2. Import on PC B
3. Modify test setup on PC B (version increments to 2)
4. Export project from PC A again (still version 1)
5. Import on PC B
6. ✅ Conflict dialog appears
7. Choose "Keep Your Current Version"
8. ✅ Local version 2 unchanged, project uses local version

**Test 4: Modified Test Setup - Use Imported**
1. Setup as Test 3
2. Choose "Use Imported Version"
3. ✅ Local test setup replaced with imported version 1
4. ✅ Version number should be 1 (from import)

**Test 5: Modified Test Setup - Keep Both**
1. Setup as Test 3
2. Choose "Keep Both"
3. ✅ New test setup created with new UUID
4. ✅ Name appended with " (imported)"
5. ✅ Both test setups visible in test setups list
6. ✅ Imported project references new UUID

**Test 6: Migration**
1. Clear localStorage
2. Load app with old test setups (no version fields)
3. ✅ Version and lastModified fields added automatically
4. ✅ All test setups have version: 1

**Test 7: Version Increment**
1. Create test setup
2. Edit name
3. ✅ Version increments to 2
4. Edit sensor
5. ✅ Version increments to 3
6. Save without changes
7. ✅ Version remains 3 (no increment)

## Future Enhancements

### Possible Improvements
1. **Content Hashing**: Use SHA-256 hash of test setup content for precise conflict detection
2. **Merge UI**: Allow users to manually merge changes (pick sensors from local, characteristics from imported)
3. **Conflict History**: Store list of past conflicts and resolutions
4. **Validation**: Warn if importing older version (version 1 importing over version 3)
5. **Batch Import**: Handle multiple test setup conflicts in one import
6. **Sync Service**: Backend service to synchronize test setups across machines

### Not Recommended
- Full Git-like branching/merging (too complex for this use case)
- Automatic conflict resolution (user should always decide)
- Version rollback (would break existing project references)

## Troubleshooting

### Conflict Dialog Not Appearing
- Check: Is imported test setup version different from local?
- Check: Is `selectedTestSetup` field present in exported JSON?
- Check: Browser console for errors in `importProject()` function

### Version Not Incrementing
- Check: Is change actually modifying test setup content?
- Check: JSON comparison returning true (no change detected)?
- Check: Browser console for errors in `setTestSetups` wrapper

### Migration Not Running
- Check: GlobalDataContext mounted?
- Check: Browser console for migration effect execution
- Clear localStorage and reload to force migration

## References
- [GitHub Issue/PR Link] (add when created)
- Original conversation summary (see chat history)
- Use-components prompt: `.github/prompts/use-components.prompt.md`
