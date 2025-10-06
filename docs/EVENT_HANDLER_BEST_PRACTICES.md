# Event Handler Best Practices

## The Golden Rule

**Never put logic directly in JSX. Always use named handler functions.**

---

## ❌ Anti-Pattern: Inline Logic in JSX

```jsx
// BAD: State management in JSX
<Modal onClose={() => setShowModal(false)} />

// BAD: Complex logic in JSX
<Button onClick={() => {
  setLoading(true);
  fetchData().then(data => {
    setData(data);
    setLoading(false);
  });
}} />

// BAD: Multiple state updates in JSX
<Form onSubmit={(e) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);
  submitData();
}} />
```

### Why This Is Bad:

1. **Hard to debug**: Can't set breakpoints on inline arrow functions easily
2. **No reusability**: Can't call the same logic from elsewhere
3. **Poor testability**: Can't mock or spy on inline functions
4. **No analytics/logging**: Nowhere to add tracking without cluttering JSX
5. **Harder to read**: Logic mixed with markup
6. **Performance**: New function created on every render (minor, but still)

---

## ✅ Best Practice: Named Handler Functions

```jsx
// GOOD: Named handler with clear intent
const handleModalClose = () => {
  setShowModal(false);
};

<Modal onClose={handleModalClose} />
```

```jsx
// GOOD: Handler with side effects
const handleDataFetch = async () => {
  setLoading(true);
  try {
    const data = await fetchData();
    setData(data);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};

<Button onClick={handleDataFetch} />
```

```jsx
// GOOD: Handler with validation and logging
const handleFormSubmit = (e) => {
  e.preventDefault();
  
  // Validation
  if (!formData.name) {
    setError('Name is required');
    return;
  }
  
  // Analytics
  trackEvent('form_submitted', { formType: 'contact' });
  
  // State updates
  setSubmitting(true);
  setError(null);
  
  // Async operation
  submitData(formData);
};

<Form onSubmit={handleFormSubmit} />
```

---

## Naming Conventions

### Pattern: `handle<Element><Action>`

```jsx
// Modal handlers
const handleModalClose = () => { ... };
const handleModalSubmit = () => { ... };

// Button handlers
const handleSaveClick = () => { ... };
const handleCancelClick = () => { ... };

// Form handlers
const handleFormSubmit = (e) => { ... };
const handleInputChange = (e) => { ... };

// Overlay handlers
const handleExplorerClose = () => { ... };
const handleExplorerSelect = (files) => { ... };
```

### Alternative Pattern: `on<Element><Action>` (if receiving as prop)

```jsx
// When defining component API
const MyComponent = ({ onSave, onCancel }) => {
  return (
    <>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </>
  );
};

// When using the component
const handleSave = () => { ... };
const handleCancel = () => { ... };

<MyComponent onSave={handleSave} onCancel={handleCancel} />
```

---

## Real-World Example: IsaQuestionnaire

### ❌ Before (Inconsistent)

```jsx
const IsaQuestionnaire = () => {
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const { explorerOpen, resolveExplorerSelection } = useGlobalDataContext();

  const handleExplorerClose = () => {
    resolveExplorerSelection(null);
  };

  const handleExplorerSelect = (files) => {
    resolveExplorerSelection(files);
  };

  return (
    <>
      {/* ❌ Inline state setter */}
      {showSessionsModal && <ProjectSessionsModal onClose={() => setShowSessionsModal(false)} />}
      
      {/* ✅ Named handler */}
      {explorerOpen && <InAppExplorer onClose={handleExplorerClose} onSelect={handleExplorerSelect} />}
    </>
  );
};
```

**Problem**: Inconsistent patterns make code harder to understand.

---

### ✅ After (Consistent)

```jsx
const IsaQuestionnaire = () => {
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const { explorerOpen, resolveExplorerSelection } = useGlobalDataContext();

  // All handlers grouped together - easy to find and maintain
  const handleSessionsModalClose = () => {
    setShowSessionsModal(false);
  };

  const handleExplorerClose = () => {
    resolveExplorerSelection(null);
  };

  const handleExplorerSelect = (files) => {
    resolveExplorerSelection(files);
  };

  return (
    <>
      {/* ✅ All use named handlers */}
      {showSessionsModal && <ProjectSessionsModal onClose={handleSessionsModalClose} />}
      {explorerOpen && <InAppExplorer onClose={handleExplorerClose} onSelect={handleExplorerSelect} />}
    </>
  );
};
```

**Benefits**:
- ✅ Consistent pattern across all overlays
- ✅ All handlers in one place (easy to find)
- ✅ Clear intent (names describe what happens)
- ✅ Easy to add logging/analytics later
- ✅ Testable (can mock individual handlers)

---

## When Inline Is Acceptable

**Very simple, single-purpose callbacks passed through:**

```jsx
// ✅ OK: Just passing through a prop
<Button onClick={onSave} />

// ✅ OK: Hook-provided function (already named)
<LoadingOverlay onCancel={cancel} />

// ✅ OK: Very simple, no side effects
<Tab onClick={() => setActiveTab('overview')} />  // Debatable, but acceptable for trivial cases
```

**Rule of thumb**: If the inline function is more than one line or does anything beyond calling a single function, extract it to a named handler.

---

## Advanced: Handler Factories

For dynamic lists where you need parameterized handlers:

### ❌ Anti-Pattern

```jsx
{items.map((item, index) => (
  <Button key={item.id} onClick={() => handleDelete(item.id)}>
    Delete
  </Button>
))}
```

**Problem**: Creates a new function on every render for every item.

---

### ✅ Best Practice: Handler Factory

```jsx
// Handler factory
const createDeleteHandler = (id) => () => {
  handleDelete(id);
};

{items.map((item) => (
  <Button key={item.id} onClick={createDeleteHandler(item.id)}>
    Delete
  </Button>
))}
```

---

### ✅ Alternative: useCallback (for expensive renders)

```jsx
const handleDelete = useCallback((id) => {
  // delete logic
}, [/* dependencies */]);

{items.map((item) => (
  <Button key={item.id} onClick={() => handleDelete(item.id)}>
    Delete
  </Button>
))}
```

---

## Testing Benefits

### ❌ Hard to Test (Inline Logic)

```jsx
<Modal onClose={() => setShowModal(false)} />

// Test must manipulate component internals
it('closes modal', () => {
  const { container } = render(<MyComponent />);
  // Can't easily test the close logic in isolation
  // Must click the button and assert state change
});
```

---

### ✅ Easy to Test (Named Handler)

```jsx
const handleModalClose = () => {
  setShowModal(false);
};

<Modal onClose={handleModalClose} />

// Test can mock the handler
it('calls handleModalClose when close button clicked', () => {
  const mockClose = jest.fn();
  render(<Modal onClose={mockClose} />);
  fireEvent.click(screen.getByText('Close'));
  expect(mockClose).toHaveBeenCalled();
});
```

---

## Debugging Benefits

### ❌ Inline: Hard to Debug

```jsx
// Where do you set a breakpoint?
<Button onClick={() => {
  setLoading(true);
  fetchData().then(data => setData(data));
}} />
```

**Problem**: Debugger shows anonymous function, hard to identify in call stack.

---

### ✅ Named Handler: Easy to Debug

```jsx
const handleFetchData = async () => {
  setLoading(true);  // ← Easy to set breakpoint here
  const data = await fetchData();
  setData(data);
};

<Button onClick={handleFetchData} />
```

**Benefits**:
- ✅ Named function shows up in call stack
- ✅ Easy to set breakpoints
- ✅ Can add console.logs temporarily
- ✅ Can add performance profiling

---

## Summary Checklist

When writing event handlers:

- [ ] **Never put multi-line logic in JSX**
- [ ] **Use named handler functions** (`handleModalClose`, not `() => ...`)
- [ ] **Group handlers together** near the top of the component
- [ ] **Use consistent naming** (`handle<Element><Action>`)
- [ ] **One handler = one responsibility** (don't mix concerns)
- [ ] **Extract complex logic** to separate functions/hooks
- [ ] **Add JSDoc comments** for complex handlers
- [ ] **Consider useCallback** for expensive child components

---

## Refactoring Checklist

When refactoring existing code:

1. Find all inline arrow functions in JSX (`onClick={() => ...}`)
2. Extract each to a named handler function
3. Group handlers together (after state/hooks, before render)
4. Ensure consistent naming across similar handlers
5. Update comments to explain what handlers do (if not obvious)
6. Test that behavior is unchanged

---

## Example: Complete Component

```jsx
const MyComponent = () => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handlers - all grouped together
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveData(data);
      handleClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setData(null);
    handleClose();
  };

  // Render
  return (
    <>
      <button onClick={handleOpen}>Open</button>
      {isOpen && (
        <Modal 
          onClose={handleClose}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </>
  );
};
```

**Benefits of this structure**:
- ✅ Clear separation: state → handlers → render
- ✅ Easy to find any handler
- ✅ Consistent naming
- ✅ Testable
- ✅ Debuggable
- ✅ Maintainable

---

## Final Rule

**If you're about to write `onClick={() => ...}` with more than a simple prop passthrough, stop and create a named handler function instead.**

This is the mark of a senior developer who writes maintainable, professional code.
