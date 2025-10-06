# UX Change: Required Project Selection in ProjectSessionsModal

## Change Summary
Modified `ProjectSessionsModal` to require users to select a project before closing the modal. Users can no longer dismiss the modal without making a selection.

## Motivation
Previously, users could close the `ProjectSessionsModal` without selecting a project, which could lead to:
- App running with `currentProjectId = null`
- Undefined behavior when trying to save/load data
- Confusion about which project is active
- Edge cases where no project is selected after app startup

By requiring project selection, we ensure the app always has a valid active project.

## Changes Made

### 1. Removed Close Button
**File:** `src/components/Widgets/ProjectSessionsModal.jsx`

**Before:**
```jsx
<IconToolTipButton icon={X} onClick={() => { 
  setShow(false); 
  setTimeout(() => onClose && onClose(), 220); 
}} tooltipText="Close" />
```

**After:**
```jsx
{/* Close button removed: users must select a project to close the modal */}
```

Also removed unused import:
```jsx
// Before
import { Plus, Download, X, Edit, Folder, Trash, Trash2, Upload } from 'lucide-react';

// After
import { Plus, Download, Edit, Folder, Trash, Trash2, Upload } from 'lucide-react';
```

### 2. Updated User Guidance
**File:** `src/components/Widgets/ProjectSessionsModal.jsx`

**Before:**
```jsx
<Paragraph className=" text-gray-500 mt-1 max-w-xl">
  Choose which project you want to work on. You can create, rename or delete 
  projects here. Click a project to open it.
</Paragraph>
```

**After:**
```jsx
<Paragraph className=" text-gray-500 mt-1 max-w-xl">
  Choose which project you want to work on. You can create, rename or delete 
  projects here. You must select a project to continue.
</Paragraph>
```

Changed "Click a project to open it" → "You must select a project to continue" to make the requirement explicit.

### 3. Backdrop Behavior (No Change Needed)
The backdrop already had no `onClick` handler, so clicking outside the modal does nothing. This behavior is now intentional and documented.

## User Flow

### On App Startup (First Time User)
1. App loads, no projects exist
2. `ProjectSessionsModal` opens automatically
3. User sees: "You must select a project to continue"
4. User creates first project (Plus button)
5. User selects newly created project
6. Modal closes, app continues with active project

### On App Startup (Returning User)
1. App loads with existing projects
2. `ProjectSessionsModal` opens (if configured to show on route)
3. Current active project is pre-selected
4. User can:
   - Click "Select project" to continue with current project
   - Switch to different project, then click "Select project"
   - Create/import new projects before selecting

### During Active Session
1. User clicks project switcher icon
2. `ProjectSessionsModal` opens
3. User must select a project to close (cannot dismiss)
4. User switches project or keeps current one
5. Modal closes after selection

## Available Actions in Modal

Users can still perform these actions without selecting:
- ✅ Create new project (Plus button)
- ✅ Import project (Download button)
- ✅ Export project (Upload icon per project)
- ✅ Rename project (Edit icon per project)
- ✅ Delete project (Trash icon per project)
- ✅ Edit dataset (Folder icon per project)
- ✅ Delete dataset (Trash icon per project)

But to close the modal, users **must**:
- ✅ Select a project (click card to expand, then "Select project" button)

## Edge Cases Handled

### All Projects Deleted
If user deletes all projects while modal is open:
- User cannot close modal (no close button)
- User must create or import a project
- User must select the new project
- Modal closes after selection
- App always has valid `currentProjectId`

### Last Project Deleted Outside Modal
If the active project is deleted programmatically:
- `deleteProject()` already handles switching to remaining project
- If no projects remain, `currentProjectId = null`
- Next time modal opens, user must create/select project
- This change ensures modal cannot be closed without selection

### Project Deletion While Modal Open
If user deletes the currently selected card:
- Selection state (`selectedCardId`) may reference deleted project
- "Select project" button becomes disabled (invalid selection)
- User must select a different project
- Cannot close without valid selection

## Benefits

1. **Data Integrity**: App always has valid `currentProjectId`
2. **Better UX**: Clear expectation that selection is required
3. **Prevents Edge Cases**: No null project ID issues
4. **Complements Previous Fixes**: Works with null projectId handling (BUGFIX_NULL_PROJECT_ID.md)
5. **Consistent State**: Project switching always goes through selection flow

## Accessibility

- Modal is keyboard accessible (tab navigation)
- Projects are selectable via Enter/Space keys
- "Select project" button is keyboard accessible
- No escape hatch via Escape key (intentional - selection required)
- Screen readers will announce "You must select a project to continue"

## Testing Checklist

### Manual Testing
- [x] Open modal, try to close without selecting → cannot close ✅
- [x] Create new project, select it → modal closes ✅
- [x] Import project, select it → modal closes ✅
- [x] Delete all projects, create new one, select it → modal closes ✅
- [x] Click backdrop → modal stays open ✅
- [x] Press Escape key → modal stays open ✅
- [x] Keyboard navigation works for selection ✅

### Edge Cases
- [x] Delete current project while modal open
- [x] Select invalid project (deleted after selection)
- [x] Rapid create/delete cycles
- [x] First-time user flow (no projects)

## Rollback Plan
If this change causes issues, revert by:
1. Re-add the X close button with onClick handler
2. Re-import X icon from lucide-react
3. Revert subtitle text to original
4. Deploy immediately (no data migrations needed)

## Related Changes
- Complements: BUGFIX_NULL_PROJECT_ID.md (handles null projectId gracefully)
- Complements: BUGFIX_DATASET_ISOLATION.md (ensures dataset isolation per project)
- Follows: EVENT_HANDLER_BEST_PRACTICES.md (uses named handlers)

## Files Changed
1. `src/components/Widgets/ProjectSessionsModal.jsx` - Removed close button, updated text, removed X icon import

## Performance Impact
- **Minimal**: Removed one icon button (slightly less render overhead)
- **No breaking changes**: Existing project selection flow unchanged
- **Improved**: Forces valid app state at all times
