# Overlay Architecture

## Overview

This document describes the consistent pattern used for all overlay components (modals, loading screens, file explorers) in the ISA-PHM Wizard application.

## Core Principle

**All overlays follow the same conditional rendering pattern for consistency, performance, and code clarity.**

```jsx
{showModal && <Modal onClose={...} />}
{isLoading && <LoadingOverlay />}
{explorerOpen && <InAppExplorer />}
```

## Overlay Components

### 1. LoadingOverlay (`src/components/ui/LoadingOverlay.jsx`)

**Purpose**: Full-screen loading indicator with optional cancel/retry actions.

**Props**:
- `message`: string - Text to display
- `isError`: boolean - Show error state with retry button
- `onCancel`: function - Cancel/close callback
- `onRetry`: function - Retry callback (shown when isError=true)

**Usage Pattern**:
```jsx
const { isSubmitting, message, error, cancel, retry, clearError } = useSubmitData();

return (
  <>
    {isSubmitting && <LoadingOverlay message={message} onCancel={cancel} />}
    {error && <LoadingOverlay message={error.message} isError onRetry={retry} onCancel={clearError} />}
  </>
);
```

**State Management**: Local component state (`isSubmitting`, `error` from hook)

---

### 2. ProjectSessionsModal (`src/components/Widgets/ProjectSessionsModal.jsx`)

**Purpose**: Project/session chooser with create, rename, delete, and dataset management.

**Props**:
- `onClose`: function - Close callback

**Usage Pattern**:
```jsx
const [showSessionsModal, setShowSessionsModal] = useState(false);

return (
  <>
    {showSessionsModal && <ProjectSessionsModal onClose={() => setShowSessionsModal(false)} />}
    <button onClick={() => setShowSessionsModal(true)}>Change Project</button>
  </>
);
```

**State Management**: Local component state (`showSessionsModal`)

---

### 3. InAppExplorer (`src/components/Widgets/InAppExplorer.jsx`)

**Purpose**: File browser overlay for selecting files from the indexed dataset.

**Props**:
- `onClose`: function - Close callback (called when user cancels)
- `onSelect`: function - Selection callback (called with array of selected files)

**Usage Pattern**:
```jsx
const { explorerOpen, closeExplorer, resolveExplorerSelection } = useGlobalDataContext();

// In render:
{explorerOpen && (
  <InAppExplorer 
    onClose={() => resolveExplorerSelection(null)}
    onSelect={(files) => resolveExplorerSelection(files)}
  />
)}

// Or with handlers:
const handleExplorerClose = () => resolveExplorerSelection(null);
const handleExplorerSelect = (files) => resolveExplorerSelection(files);

{explorerOpen && (
  <InAppExplorer 
    onClose={handleExplorerClose}
    onSelect={handleExplorerSelect}
  />
)}

// To open from anywhere (promise-based API):
const selection = await openExplorer();
if (selection) {
  // user confirmed selection
} else {
  // user cancelled
}
```

**State Management**: Hybrid approach
- **Visibility**: Global context (`explorerOpen` in GlobalDataContext)
- **Promise resolution**: Global context (`resolveExplorerSelection()`)
- **Component props**: `onClose` and `onSelect` for clean separation

**Why global visibility?**: The explorer needs to be triggered from multiple places (FilePickerPlugin, slides, etc.) with a promise-based API. The visibility state is global, but the component itself is a pure presentational component with proper callbacks.

**Architecture**: This follows the **Command pattern** - `openExplorer()` creates a command (opens modal + creates promise), and the component's callbacks fulfill that command (resolve promise + close modal).

---

## Best Practices

### 1. Always Conditionally Render

❌ **Bad** (component manages its own visibility):
```jsx
// Always mounted, hides itself internally
<InAppExplorer />

export default function InAppExplorer() {
  const { explorerOpen } = useGlobalDataContext();
  if (!explorerOpen) return null; // ❌ Internal visibility logic
  return <div>...</div>;
}
```

✅ **Good** (parent controls visibility, component receives callbacks):
```jsx
// Only mounted when needed, receives proper callbacks
{explorerOpen && <InAppExplorer onClose={...} onSelect={...} />}

export default function InAppExplorer({ onClose, onSelect }) {
  // Pure presentational component with clean API
  return <div>...</div>;
}
```

**Why?**: 
- **Performance**: Component doesn't mount until needed
- **Clarity**: Visibility logic is in one place (parent)
- **Consistency**: All overlays follow the same pattern (props for callbacks)
- **Testability**: Easier to test when callbacks are injected
- **Single Responsibility**: Component renders UI, parent manages state

### 2. Mark Background as Inert

When an overlay is visible, mark the main content as inert:

```jsx
<div 
  aria-hidden={showModal || showAnother}
  className={showModal || showAnother ? 'pointer-events-none select-none opacity-60' : ''}
>
  {/* Main content */}
</div>
```

This provides:
- Accessibility: Screen readers skip inert content
- Visual feedback: Dimmed/disabled appearance
- Interaction prevention: No accidental clicks

### 3. Use Backdrop Click to Close (Optional)

For non-critical overlays, allow closing by clicking the backdrop:

```jsx
<div 
  className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
  onClick={onClose}
>
  <div onClick={(e) => e.stopPropagation()}>
    {/* Modal content */}
  </div>
</div>
```

**Don't use for**: Critical confirmations, forms with unsaved data

### 4. Consistent Z-Index Stacking

- Loading overlays: `z-[10000]` (highest)
- Modals/Explorers: `z-50`
- Floating buttons: `z-40`
- Header/Nav: `z-30`

---

## Migration Checklist

When adding a new overlay component:

- [ ] Component accepts `onClose` prop (or uses GlobalContext promise pattern)
- [ ] Parent conditionally renders: `{show && <Component />}`
- [ ] No internal `if (!show) return null` logic
- [ ] Background marked as inert when overlay visible
- [ ] Proper z-index applied
- [ ] Escape key closes overlay (if appropriate)
- [ ] Focus trap implemented (for keyboard navigation)
- [ ] Component documented in this file

---

## Common Pitfalls

### ❌ Mounting overlay permanently
```jsx
// Wrong - always mounted
<InAppExplorer />
```

### ✅ Conditional rendering
```jsx
// Correct
{explorerOpen && <InAppExplorer />}
```

---

### ❌ Mixed patterns
```jsx
// Wrong - inconsistent
{showModal && <Modal />}
<AlwaysMountedExplorer />  // Hides itself internally
```

### ✅ Consistent patterns
```jsx
// Correct - all conditional
{showModal && <Modal />}
{explorerOpen && <Explorer />}
```

---

## Testing

### Unit Tests

Test overlay visibility and callbacks:

```jsx
it('renders when show prop is true', () => {
  render(<Modal show={true} onClose={jest.fn()} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('calls onClose when cancel button clicked', () => {
  const onClose = jest.fn();
  render(<Modal show={true} onClose={onClose} />);
  fireEvent.click(screen.getByText('Cancel'));
  expect(onClose).toHaveBeenCalled();
});
```

### Integration Tests

Test the full conditional rendering flow:

```jsx
it('shows and hides overlay correctly', () => {
  const { rerender } = render(<Page />);
  
  // Initially hidden
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  
  // Show overlay
  fireEvent.click(screen.getByText('Open'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  
  // Hide overlay
  fireEvent.click(screen.getByText('Close'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

---

## Summary

**Key Takeaway**: All overlays should be pure presentational components that are conditionally rendered by their parent. Visibility state lives either in local component state (for page-specific overlays) or global context (for app-wide overlays like InAppExplorer).

This pattern ensures:
- ✅ Performance (no unnecessary mounting)
- ✅ Clarity (visibility logic in one place)
- ✅ Consistency (all overlays work the same way)
- ✅ Testability (easy to mock and assert visibility)
