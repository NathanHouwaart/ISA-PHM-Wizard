# Code Review: ProjectSessionsModal.jsx

**Component**: `src/components/Widgets/ProjectSessionsModal.jsx`  
**Reviewed**: October 7, 2025  
**Reviewers**: AI Code Review Agent (following project coding standards)

---

## Executive Summary

The `ProjectSessionsModal` component manages project sessions in the ISA-PHM Wizard application. While it functions correctly, it has significant architectural issues that violate project best practices around component composition, separation of concerns, and maintainability. This document provides a comprehensive analysis and proposes a refactoring plan.

**Overall Assessment**: ⚠️ **Requires Significant Refactoring**

**Key Issues**:
- Violation of Single Responsibility Principle (500+ lines, multiple concerns)
- Tight coupling and poor separation of concerns
- Direct localStorage manipulation bypassing the data context
- Missing reusable component opportunities
- Insufficient error handling and loading states
- Accessibility gaps

---

## Detailed Analysis

### 1. ✅ **Strengths**

#### 1.1 Component Declaration Pattern
- ✅ **PASS**: Uses arrow function with default export (follows `use_const_lambda_function.prompt.md`)
- ✅ **PASS**: Component name matches file name

#### 1.2 Canonical Component Usage
- ✅ **PASS**: Uses `FormField` for rename input (follows `use-components.prompt.md`)
- ✅ **PASS**: Uses `IconTooltipButton` and `TooltipButton` for actions
- ✅ **PASS**: Uses `Heading3` and `Paragraph` for typography
- ✅ **PASS**: Proper import organization (third-party separated from local imports)

#### 1.3 Accessibility
- ✅ **PASS**: Cards support keyboard navigation (tabIndex, onKeyDown)
- ✅ **PASS**: Tooltips provide context for icon buttons
- ✅ **PASS**: Focus management in rename mode

#### 1.4 State Management
- ✅ **PASS**: Uses stable UUIDs for keys (not array indices)
- ✅ **PASS**: Immutable state updates with spread operators
- ✅ **PASS**: Proper cleanup in useEffect return functions

---

### 2. ❌ **Critical Issues**

#### 2.1 Single Responsibility Violation
**Severity**: 🔴 **CRITICAL**

The component handles too many responsibilities:
1. Project CRUD operations (create, delete, rename)
2. Dataset management (index, delete, import/export)
3. Tree/file system operations
4. Modal presentation logic
5. Progress tracking for multiple projects
6. Test setup conflict resolution
7. Direct localStorage manipulation

**Problems**:
- 500+ lines in a single component
- Hard to test individual features
- Difficult to maintain and debug
- High cognitive load for developers

**Evidence**:
```javascript
// Lines 14-26: Too many state variables
const [loadingMap, setLoadingMap] = useState({});
const [trees, setTrees] = useState({});
const [renameMap, setRenameMap] = useState({});
const [progressMap, setProgressMap] = useState({});
const [show, setShow] = useState(false);
const [selectedCardId, setSelectedCardId] = useState(currentProjectId || null);
const [activeIndexingProjectId, setActiveIndexingProjectId] = useState(null);
const [pendingImport, setPendingImport] = useState(null);
```

---

#### 2.2 Tight Coupling & Poor Separation of Concerns
**Severity**: 🔴 **CRITICAL**

**Issue**: Direct localStorage manipulation bypasses GlobalDataContext
```javascript
// Lines 280-282: Directly reading from localStorage
const setupsRaw = localStorage.getItem('globalAppData_testSetups');
const setups = setupsRaw ? JSON.parse(setupsRaw) : [];

// Lines 314-315: Direct localStorage writes
localStorage.setItem('globalAppData_testSetups', JSON.stringify(setups));

// Lines 475-485: Multiple places reading localStorage directly
const setupIdRaw = localStorage.getItem(`globalAppData_${p.id}_selectedTestSetupId`);
const setupsRaw = localStorage.getItem(`globalAppData_testSetups`);
const lastEditedRaw = localStorage.getItem(`globalAppData_${p.id}_lastEdited`);
```

**Problems**:
- Violates the documented architecture (GlobalDataContext as "single source of truth")
- Creates data consistency risks
- Makes state harder to reason about
- Testing becomes difficult (needs localStorage mocking)
- Bypasses the centralized persistence layer

**From `.github/copilot-instructions.md`**:
> "Central State: All app data flows through GlobalDataContext"
> "GlobalDataContext as single source of truth"

---

#### 2.3 Missing Reusable Component Opportunities
**Severity**: 🟠 **HIGH**

**Issue**: Duplicated UI patterns that should be extracted

**Example 1: Project Card Component**
Lines 400-550 contain a complex card structure that's repeated for each project. This 150-line block should be its own component:

```jsx
// Current: Inline rendering in map()
projects.map((p, idx) => (
  <div className="relative flex items-center...">
    {/* 150+ lines of card UI */}
  </div>
))
```

**Should be**:
```jsx
<ProjectCard
  project={p}
  isSelected={selectedCardId === p.id}
  tree={trees[p.id]}
  loading={loadingMap[p.id]}
  progress={progressMap[p.id]}
  isRenaming={renameMap[p.id]}
  isActive={p.id === currentProjectId}
  isDefault={p.id === DEFAULT_PROJECT_ID}
  onSelect={() => setSelectedCardId(p.id)}
  onRename={(newName) => renameProject(p.id, newName)}
  onDelete={() => handleDelete(p.id)}
  onEditDataset={() => handleEditDataset(p.id)}
  onDeleteDataset={() => handleDeleteDataset(p.id)}
  onExport={() => handleExportProject(p.id)}
  onReset={() => resetProject(p.id)}
/>
```

**Benefits**:
- Reduces modal complexity from 500+ to ~200 lines
- Makes card behavior testable in isolation
- Improves code readability
- Enables easier A/B testing and feature flags

**Example 2: Progress Overlay Component**
Lines 427-441 show a progress overlay pattern:

```jsx
{progressMap[p.id] ? (
  <div className="absolute inset-0 z-10 flex items-center justify-center p-4 rounded-lg">
    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg" />
    <div className="relative w-3/4 max-w-md">
      <div className="text-sm text-gray-700 mb-2 text-center">{progressMap[p.id].message}</div>
      <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressMap[p.id].percent}%` }} />
      </div>
      <div className="mt-2 text-xs text-gray-600 text-right">{progressMap[p.id].percent}%</div>
    </div>
  </div>
) : null}
```

**Should be**:
```jsx
<ProgressOverlay progress={progressMap[p.id]} />
```

**Example 3: Dataset Info Row Component**
Lines 456-468 show a repeating key-value pattern:

```jsx
<div className="grid grid-cols-12 gap-x-5 items-center">
  <div className="col-span-3 text-sm font-medium text-gray-600">Label:</div>
  <div className="col-span-9 text-sm text-gray-700">Value</div>
</div>
```

**Should be**:
```jsx
<KeyValueRow label="Dataset" value={trees[p.id]?.rootName || 'None'} loading={loadingMap[p.id]} />
<KeyValueRow label="Test setup" value={setupName} />
<KeyValueRow label="Last edited" value={formatDate(lastEdited)} className="text-xs text-gray-400" />
```

**Violates**: `promote-reusability.prompt.md` guidance:
> "Always propose a design and a small adoption plan before implementing a new reusable component"
> "You find repeated UI patterns across 2+ files (similar form fields, buttons, row layouts, subtitle patterns)"

---

#### 2.4 Business Logic in UI Component
**Severity**: 🟠 **HIGH**

**Issue**: Complex async operations and data transformations are embedded in the UI component

**Examples**:
- Lines 125-228: 100+ line `handleEditDataset` function with file system operations
- Lines 231-249: Export logic with blob creation
- Lines 252-272: Import logic with JSON parsing
- Lines 299-368: 70-line conflict resolution logic

**Should be**: Extracted to custom hooks or service layer

```javascript
// Current: All in component
async function handleEditDataset(id) {
  try {
    setLoadingMap(/*...*/);
    setActiveIndexingProjectId(id);
    const dataset = await fileSystem.pickAndIndexDirectory(/*...*/);
    await saveTree(dataset, id);
    setTrees(/*...*/);
    // 50+ more lines
  } catch (err) {
    // error handling
  }
}

// Should be: Hook-based
const { indexDataset, isIndexing, progress, error } = useProjectDataset(projectId);

// Usage in component
await indexDataset();
```

**Benefits**:
- Testable business logic (unit tests without React)
- Reusable across components
- Clearer component purpose (presentation + orchestration)
- Easier error handling patterns

---

#### 2.5 Error Handling Issues
**Severity**: 🟠 **HIGH**

**Issue 1**: Inconsistent error messaging
```javascript
// Lines 115-120: Generic error alert
} catch (err) {
  console.error('[ProjectSessionsModal] delete dataset error', err);
  alert('Failed to delete dataset: ' + (err && err.message));
}

// Lines 192-207: Detailed, user-friendly error messages
if (err && err.name === 'NotAllowedError') {
  errorMsg = 'Permission denied. Please grant access to the folder.';
} else if (err && err.name === 'NotFoundError') {
  errorMsg = 'The operation was canceled by the browser.\n\n...';
}
```

**Issue 2**: No error state tracking
- Errors are shown with `alert()` (blocking, not accessible)
- No way to dismiss or retry failed operations
- Error state is lost immediately

**Should be**:
```javascript
const [errors, setErrors] = useState({});

// Show errors in UI
{errors[p.id] && (
  <ErrorBanner
    message={errors[p.id]}
    onRetry={() => retryOperation(p.id)}
    onDismiss={() => clearError(p.id)}
  />
)}
```

---

#### 2.6 Accessibility Gaps
**Severity**: 🟡 **MEDIUM**

**Issue 1**: No ARIA labels for modal
```jsx
// Line 374: Missing role and aria-labelledby
<div className="fixed inset-0 z-50 flex items-center justify-center">
```

**Should be**:
```jsx
<div 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="modal-heading"
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <Heading3 id="modal-heading">Select a project session</Heading3>
```

**Issue 2**: Focus trap missing
- Modal doesn't trap focus (tab key can escape)
- No return focus to trigger element on close

**Issue 3**: Loading states not announced
```jsx
// Line 461: Spinner without sr-only text
<span className="inline-flex items-center gap-2 text-sm text-indigo-600">
  <svg className="animate-spin h-4 w-4" />
  Indexing...
</span>
```

**Should have**: `<span className="sr-only">Loading project dataset</span>`

---

#### 2.7 Performance Issues
**Severity**: 🟡 **MEDIUM**

**Issue 1**: Unnecessary re-renders
- Every state change triggers full modal re-render
- Project cards don't use `React.memo` or optimization

**Issue 2**: Inefficient tree loading
Lines 57-78: Serial async operations in useEffect
```javascript
for (const p of projects) {
  setLoadingMap((m) => ({ ...m, [p.id]: true }));
  const tree = await loadTree(p.id);  // Sequential, not parallel
  setLoadingMap((m) => ({ ...m, [p.id]: false }));
}
```

**Should be**:
```javascript
// Parallel loading
const treePromises = projects.map(p => 
  loadTree(p.id).catch(err => null)
);
const trees = await Promise.all(treePromises);
```

---

#### 2.8 Code Duplication
**Severity**: 🟡 **MEDIUM**

**Issue**: localStorage access pattern repeated 10+ times
```javascript
// Pattern repeated throughout:
const setupsRaw = localStorage.getItem('globalAppData_testSetups');
const setups = setupsRaw ? JSON.parse(setupsRaw) : [];
if (!Array.isArray(setups)) setups = [];
```

**Should be**: Utility function or hook
```javascript
const { testSetups, updateTestSetups } = useTestSetups();
```

---

### 3. 🟡 **Minor Issues**

#### 3.1 Magic Numbers
Lines 37, 85, 195: Hardcoded delays without constants
```javascript
setTimeout(() => { /* focus input */ }, 50);
setTimeout(() => { switchProject(id); }, 240);
setTimeout(() => { /* clear progress */ }, 1200);
```

**Should be**:
```javascript
const FOCUS_DELAY_MS = 50;
const MODAL_ANIMATION_MS = 240;
const PROGRESS_CLEAR_DELAY_MS = 1200;
```

#### 3.2 Missing PropTypes or TypeScript
No type checking for props or return values. Consider adding PropTypes or migrating to TypeScript.

#### 3.3 Inconsistent Naming
- `handleEditDataset` actually "picks and indexes" (misleading name)
- `trees` could be `datasetTrees` or `projectDatasets` (more descriptive)

---

## Refactoring Plan

### Phase 1: Extract Reusable Components (Week 1)
**Goal**: Reduce modal complexity, improve testability

**Priority**: 🔴 **CRITICAL**

#### Task 1.1: Create `ProjectCard` Component
**File**: `src/components/Widgets/ProjectCard.jsx`

**API Design**:
```typescript
interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isActive: boolean;
  isDefault: boolean;
  tree: DatasetTree | null;
  loading: boolean;
  progress?: { percent: number; message: string };
  isRenaming: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onEditDataset: () => void;
  onDeleteDataset: () => void;
  onExport: () => void;
  onReset?: () => void;
}
```

**Adoption**:
- Replace inline card rendering in `ProjectSessionsModal` (lines 400-550)
- Reduces modal from 500+ lines to ~250 lines
- Makes card behavior testable in isolation

**Tests**:
- Render with different states (selected, loading, renaming)
- Keyboard navigation (Enter, Space)
- Action button clicks
- Progress overlay visibility

---

#### Task 1.2: Create `ProgressOverlay` Component
**File**: `src/components/Widgets/ProgressOverlay.jsx`

**API Design**:
```typescript
interface ProgressOverlayProps {
  progress: { percent: number; message: string } | null;
  className?: string;
}
```

**Usage**:
```jsx
<ProgressOverlay progress={progressMap[projectId]} />
```

**Adoption**:
- Replace inline progress overlay in `ProjectCard` (extracted from lines 427-441)
- Reusable in other components that need progress indicators

---

#### Task 1.3: Create `KeyValueRow` Component
**File**: `src/components/Typography/KeyValueRow.jsx`

**API Design**:
```typescript
interface KeyValueRowProps {
  label: string;
  value: string | React.ReactNode;
  loading?: boolean;
  className?: string;
}
```

**Adoption**:
- Replace grid-based key-value rows in `ProjectCard` (lines 456-468)
- Can be reused in detail panels across the app

---

### Phase 2: Extract Business Logic (Week 2)
**Goal**: Separate concerns, improve testability

**Priority**: 🔴 **CRITICAL**

#### Task 2.1: Create `useProjectDataset` Hook
**File**: `src/hooks/useProjectDataset.js`

**API Design**:
```javascript
function useProjectDataset(projectId) {
  return {
    tree: DatasetTree | null,
    loading: boolean,
    progress: { percent: number, message: string } | null,
    error: Error | null,
    indexDataset: () => Promise<void>,
    deleteDataset: () => Promise<void>,
    clearError: () => void,
  };
}
```

**Responsibilities**:
- File system operations (pick directory, index files)
- IndexedDB persistence (saveTree, loadTree, clearTree)
- Progress tracking
- Error handling

**Benefits**:
- 100+ lines of business logic removed from UI component
- Testable without React (unit tests for data operations)
- Reusable in other components

---

#### Task 2.2: Create `useProjectImportExport` Hook
**File**: `src/hooks/useProjectImportExport.js`

**API Design**:
```javascript
function useProjectImportExport() {
  return {
    exportProject: (projectId: string) => Promise<void>,
    importProject: (file: File) => Promise<ImportResult>,
    resolveConflict: (resolution: string) => Promise<void>,
    pendingConflict: Conflict | null,
    cancelImport: () => void,
  };
}
```

**Responsibilities**:
- Export logic (JSON serialization, download)
- Import logic (file reading, parsing, validation)
- Conflict detection and resolution
- Test setup handling

**Benefits**:
- 150+ lines of logic removed from component
- Centralized import/export logic for consistency
- Easier to add import/export features (e.g., from URL, from clipboard)

---

#### Task 2.3: Refactor GlobalDataContext Integration
**File**: `src/contexts/GlobalDataContext.jsx`

**Changes**:
1. Add methods for test setup management (instead of direct localStorage)
2. Add methods for project metadata (lastEdited, selectedTestSetupId)
3. Expose loading states for projects

**API Additions**:
```javascript
{
  // Existing
  projects: Project[],
  createProject: (name: string) => string,
  deleteProject: (id: string) => void,
  renameProject: (id: string, name: string) => void,
  
  // New
  testSetups: TestSetup[],
  updateTestSetup: (id: string, setup: TestSetup) => void,
  addTestSetup: (setup: TestSetup) => void,
  removeTestSetup: (id: string) => void,
  
  getProjectMetadata: (id: string) => ProjectMetadata,
  updateProjectMetadata: (id: string, metadata: Partial<ProjectMetadata>) => void,
}
```

**Benefits**:
- Eliminates direct localStorage manipulation in UI components
- Maintains "single source of truth" architecture
- Centralizes data persistence logic

---

### Phase 3: Improve Error Handling & Accessibility (Week 3)
**Goal**: Better UX, WCAG compliance

**Priority**: 🟠 **HIGH**

#### Task 3.1: Replace `alert()` with Toast/Banner System
**File**: `src/components/Widgets/ErrorBanner.jsx`

**Implementation**:
```jsx
<ErrorBanner
  message={error.message}
  type={error.type} // 'error' | 'warning' | 'info'
  onRetry={error.retryFn}
  onDismiss={() => clearError()}
  autoHideDuration={5000}
/>
```

**Changes in Modal**:
- Add `errors` state map: `{ [projectId]: Error }`
- Show errors inline in project cards
- Allow retry and dismiss actions

---

#### Task 3.2: Add Focus Management
**File**: `src/hooks/useFocusTrap.js`

**Usage**:
```javascript
const modalRef = useFocusTrap({ 
  active: true, 
  returnFocus: true 
});

<div ref={modalRef} role="dialog">...</div>
```

**Implementation**:
- Trap focus within modal (Tab cycles through interactive elements)
- Return focus to trigger element on close
- Handle Escape key globally

---

#### Task 3.3: Add ARIA Annotations
**Changes**:
- Add `role="dialog"` and `aria-modal="true"` to modal
- Add `aria-labelledby` pointing to heading
- Add `aria-describedby` for subtitle
- Add `aria-live="polite"` for progress updates
- Add `aria-busy="true"` during loading states

---

### Phase 4: Performance Optimization (Week 4)
**Goal**: Reduce re-renders, improve load times

**Priority**: 🟡 **MEDIUM**

#### Task 4.1: Memoize Project Cards
```javascript
const ProjectCard = React.memo(({ project, ...props }) => {
  // Card implementation
}, (prevProps, nextProps) => {
  // Custom comparison for deep props
  return prevProps.project.id === nextProps.project.id &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.loading === nextProps.loading;
});
```

#### Task 4.2: Parallelize Tree Loading
```javascript
// Replace sequential loading (lines 57-78)
const loadAllTrees = async (projects) => {
  const results = await Promise.allSettled(
    projects.map(p => loadTree(p.id))
  );
  
  return results.reduce((acc, result, index) => {
    acc[projects[index].id] = result.status === 'fulfilled' 
      ? result.value 
      : null;
    return acc;
  }, {});
};
```

---

### Phase 5: Testing & Documentation (Week 5)
**Goal**: Ensure quality, maintainability

**Priority**: 🟡 **MEDIUM**

#### Task 5.1: Unit Tests
**Files**:
- `ProjectCard.test.jsx` (rendering, interactions, keyboard nav)
- `useProjectDataset.test.js` (indexing, error handling)
- `useProjectImportExport.test.js` (export, import, conflicts)

**Coverage targets**: >80% for new components and hooks

#### Task 5.2: Integration Tests
**Test scenarios**:
- Create project → rename → switch → delete
- Index dataset → export project → import in new project
- Conflict resolution flow (keep local, use imported, keep both)

#### Task 5.3: Documentation
**Files to create**:
- `docs/PROJECT_SESSIONS_ARCHITECTURE.md` (component breakdown, data flow)
- Update `README.md` with project management section
- JSDoc comments for all new hooks and components

---

## Success Criteria

### Immediate (Phase 1-2)
- ✅ Modal component reduced to <250 lines
- ✅ 3+ reusable components extracted
- ✅ Business logic moved to custom hooks
- ✅ No direct localStorage access in UI components
- ✅ All tests passing

### Long-term (Phase 3-5)
- ✅ WCAG AA compliance (focus management, ARIA)
- ✅ Error states shown in UI (no `alert()`)
- ✅ >80% test coverage for new code
- ✅ Performance: Modal opens in <100ms
- ✅ Performance: Tree loading uses parallel requests

---

## Risk Assessment

### High Risk
1. **Breaking existing functionality**: Extensive refactoring may introduce bugs
   - **Mitigation**: Incremental changes with tests, feature flags for gradual rollout

2. **Data migration**: Changes to localStorage structure
   - **Mitigation**: Add migration scripts, backward compatibility checks

### Medium Risk
1. **Hook complexity**: Custom hooks may become hard to maintain
   - **Mitigation**: Keep hooks focused (single responsibility), add JSDoc

2. **Performance regression**: New abstractions may slow down UI
   - **Mitigation**: Performance benchmarks, React DevTools profiling

### Low Risk
1. **Component API changes**: New props may need refactoring later
   - **Mitigation**: TypeScript interfaces, versioned APIs

---

## Alignment with Project Standards

### ✅ **Follows**
- Arrow function default export pattern (`use_const_lambda_function.prompt.md`)
- Canonical component usage (`use-components.prompt.md`)
- Stable keys for lists
- Accessibility basics (keyboard nav, tooltips)

### ❌ **Violates**
- **Promote Reusability** (`promote-reusability.prompt.md`)
  - Missing design brief for extracted components
  - No incremental adoption plan
  - Duplicated UI patterns not extracted

- **Architecture** (`.github/copilot-instructions.md`)
  - Direct localStorage bypass of GlobalDataContext
  - Business logic in UI component
  - Hook pattern not followed consistently

---

## Conclusion

The `ProjectSessionsModal` component requires significant refactoring to align with project standards. While it functions correctly, its architecture violates core principles of separation of concerns, reusability, and maintainability.

**Recommended Action**: Proceed with the phased refactoring plan, starting with Phase 1 (extracting reusable components) to reduce complexity and improve testability. Prioritize Phases 1-2 as critical for architectural alignment.

**Estimated Effort**: 3-5 weeks for full refactoring (5 phases)  
**Minimum Viable Improvement**: 1-2 weeks for Phase 1-2 (component extraction + hook extraction)

**Next Steps**:
1. Review this document with the team
2. Create GitHub issues for each phase
3. Start with Phase 1, Task 1.1 (ProjectCard component)
4. Establish CI/CD checks for new code standards

---

## Appendix: Code Metrics

**Current State**:
- Lines of code: 610
- Number of functions: 12
- Number of state variables: 8
- Cyclomatic complexity: 47 (high)
- Maximum nesting depth: 6 (high)

**Target State** (after refactoring):
- Lines of code: <250 (modal), ~400 (extracted components/hooks)
- Number of functions: 6 (modal only)
- Number of state variables: 3-4 (modal only)
- Cyclomatic complexity: <15 (per component/hook)
- Maximum nesting depth: 3

---

**Document Version**: 1.0  
**Last Updated**: October 7, 2025
