# Hook API Standardization Proposal

**Date:** October 7, 2025  
**Type:** Refactoring / API Consistency  
**Following:** [promote-reusability.prompt.md](../.github/prompts/promote-reusability.prompt.md)

---

## 1. Design Brief

### Problem Statement

Our entity hooks (`useStudies`, `useVariables`, `useContacts`, `usePublications`) have **inconsistent APIs**, making them harder to use and maintain:

**Pattern A (useVariables, useMeasurementProtocols, useProcessingProtocols):**
```jsx
return {
    items,
    setItems,
    addItem,      // ✅ Built-in CRUD
    updateItem,   // ✅ Built-in CRUD
    removeItem,   // ✅ Built-in CRUD
    cardComponent: () => Component
}
```

**Pattern B (useStudies, useContacts, usePublications):**
```jsx
return {
    items,
    setItems,     // ❌ Exposes raw setter
    getCard: () => Component,
    getForm: () => Component,
    getView: () => Component
    // ❌ No built-in CRUD - consumers must implement
}
```

### Why This Matters

1. **EntityMappingPanel expects Pattern A** - It destructures `{ addItem, updateItem, removeItem }`:
   ```jsx
   const { items, updateItem, addItem, removeItem, cardComponent } = itemHook();
   ```

2. **Pattern B forces code duplication** - Every consumer must reimplement add/update/remove logic

3. **Inconsistent naming** - `cardComponent` vs `getCard`, `getForm`, `getView`

4. **Mental overhead** - Developers must remember which pattern each hook uses

### Where This is Used

- **EntityMappingPanel** (3 usages): StudyVariableSlide, ContactSlide, StudySlide
- **Collection component** (multiple usages): StudySlide, ContactSlide, PublicationSlide
- **DataGrid integration** (grid views): All slides with grid tabs

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Keep both patterns | No breaking changes | Continues inconsistency | ❌ Rejected |
| Standardize on Pattern B | Simpler hook API | Forces duplication in consumers | ❌ Rejected |
| **Standardize on Pattern A** | Eliminates duplication, consistent with EntityMappingPanel | Requires refactoring Pattern B hooks | ✅ **Chosen** |

---

## 2. API Design (Standardized Hook Interface)

### Minimal, Consistent API

```tsx
/**
 * Standard entity hook interface
 * All entity hooks (useStudies, useVariables, etc.) must follow this contract
 */
interface EntityHook<T> {
    // Data
    items: T[];
    setItems: (items: T[] | ((prev: T[]) => T[])) => void;
    
    // CRUD operations
    addItem: (partialData?: Partial<T>) => void;
    updateItem: (item: T) => void;
    removeItem: (id: string) => void;
    
    // UI Components
    card: React.ComponentType<CardProps<T>>;
    form?: React.ComponentType<FormProps<T>>;  // Optional
    view?: React.ComponentType<ViewProps<T>>;  // Optional
}
```

### Example Usage

```jsx
// ✅ Consistent API across all entity hooks
const studies = useStudies();
const variables = useVariables();
const contacts = useContacts();

// All work the same way
studies.addItem();
variables.addItem();
contacts.addItem();

// All have the same component structure
<studies.card item={study} />
<variables.card item={variable} />
<contacts.card item={contact} />
```

---

## 3. Implementation Plan

### Phase 1: Create Shared CRUD Utilities (New File)

**File:** `src/hooks/utils/entityCrudOperations.js`

```jsx
import { v4 as uuidv4 } from 'uuid';

/**
 * Generic CRUD operations for entity arrays
 * Reusable across all entity hooks
 */
export const createEntityOperations = (items, setItems, defaultTemplate = {}) => {
    const addItem = (partialData = {}) => {
        const newItem = {
            id: uuidv4(),
            name: `New Item ${items.length + 1}`,
            ...defaultTemplate,
            ...partialData
        };
        setItems(prev => [...prev, newItem]);
        return newItem;
    };

    const updateItem = (updatedItem) => {
        setItems(prev => {
            const index = prev.findIndex(item => item.id === updatedItem.id);
            if (index === -1) return prev; // Not found, no change
            
            const updated = [...prev];
            updated[index] = updatedItem;
            return updated;
        });
    };

    const removeItem = (itemId) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    return { addItem, updateItem, removeItem };
};
```

### Phase 2: Refactor useStudies (Pattern B → Pattern A)

**File:** `src/hooks/useStudies.jsx`

```jsx
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { createEntityOperations } from './utils/entityCrudOperations';
import StudyCard from '../components/Study/StudyCard';
import StudyForm from '../components/Study/StudyForm';
import StudyView from '../components/Study/StudyView';

const useStudies = () => {
    const { studies, setStudies } = useGlobalDataContext();

    // ✅ Use shared CRUD operations
    const { addItem, updateItem, removeItem } = createEntityOperations(
        studies,
        setStudies,
        {
            name: 'New Study',
            description: '',
            submissionDate: '',
            publicationDate: ''
        }
    );

    return {
        items: studies,
        setItems: setStudies,
        addItem,
        updateItem,
        removeItem,
        // ✅ Consistent naming: direct component references
        card: StudyCard,
        form: StudyForm,
        view: StudyView
    };
};

export default useStudies;
```

### Phase 3: Refactor useContacts

**File:** `src/hooks/useContacts.jsx`

```jsx
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { createEntityOperations } from './utils/entityCrudOperations';
import ContactCard from '../components/Contact/ContactCard';
import ContactForm from '../components/Contact/ContactForm';
import ContactView from '../components/Contact/ContactView';

const useContacts = () => {
    const { contacts, setContacts } = useGlobalDataContext();

    const { addItem, updateItem, removeItem } = createEntityOperations(
        contacts,
        setContacts,
        {
            firstName: '',
            lastName: '',
            email: '',
            affiliation: '',
            roles: []
        }
    );

    return {
        items: contacts,
        setItems: setContacts,
        addItem,
        updateItem,
        removeItem,
        card: ContactCard,
        form: ContactForm,
        view: ContactView
    };
};

export default useContacts;
```

### Phase 4: Refactor usePublications

**File:** `src/hooks/usePublications.jsx`

```jsx
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { createEntityOperations } from './utils/entityCrudOperations';
import { PublicationCard } from '../components/Publication/PublicationCard';
import { PublicationForm } from '../components/Publication/PublicationForm';

const usePublications = () => {
    const { publications, setPublications } = useGlobalDataContext();

    const { addItem, updateItem, removeItem } = createEntityOperations(
        publications,
        setPublications,
        {
            title: '',
            authors: [],
            doi: '',
            pubMedID: '',
            status: ''
        }
    );

    return {
        items: publications,
        setItems: setPublications,
        addItem,
        updateItem,
        removeItem,
        card: PublicationCard,
        form: PublicationForm,
        view: null  // No view component for publications
    };
};

export default usePublications;
```

### Phase 5: Update useVariables (Minor Cleanup)

**File:** `src/hooks/useVariables.jsx`

```jsx
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { createEntityOperations } from './utils/entityCrudOperations';
import { StudyVariableMappingCard } from '../components/StudyVariableMappingCard';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';

const useVariables = () => {
    const { studyVariables, setStudyVariables } = useGlobalDataContext();

    const { addItem, updateItem, removeItem } = createEntityOperations(
        studyVariables,
        setStudyVariables,
        {
            name: 'New Variable',
            type: VARIABLE_TYPE_OPTIONS[0],
            unit: '',
            description: ''
        }
    );

    return {
        items: studyVariables,
        setItems: setStudyVariables,
        addItem,
        updateItem,
        removeItem,
        // ✅ Consistent naming: direct component reference
        card: StudyVariableMappingCard
    };
};

export default useVariables;
```

### Phase 6: Update EntityMappingPanel

**File:** `src/components/EntityMappingPanel.jsx`

```jsx
export function EntityMappingPanel({ 
    name, 
    tileNamePrefix, 
    itemHook, 
    mappings, 
    handleInputChange, 
    disableAdd = false, 
    minHeight 
}) {
    // ✅ Now consistent across all hooks
    const { items, addItem, updateItem, removeItem, card: CardComponent } = itemHook();

    // ... rest of the component remains the same
    
    return (
        <div className='flex' style={minHeight ? { minHeight } : undefined}>
            {/* ... */}
            {selectedEntity && (
                <CardComponent
                    item={selectedEntity}
                    itemIndex={selectedEntityIndex}
                    mappings={mappings ?? controller.mappings}
                    onSave={updateItem}
                    handleInputChange={effectiveHandleInputChange}
                    removeParameter={removeItem}
                    openEdit={openEditOnAdd}
                    onOpenHandled={() => setOpenEditOnAdd(false)}
                />
            )}
        </div>
    );
}
```

---

## 4. Migration Strategy

### Step-by-Step Rollout

1. **Create utility file** (no breaking changes)
   - Add `src/hooks/utils/entityCrudOperations.js`
   - Add tests for CRUD operations

2. **Migrate useStudies** (first adopter)
   - Refactor useStudies to use new pattern
   - Update Collection component in StudySlide to use `studies.addItem()` instead of custom logic
   - Test thoroughly

3. **Migrate useContacts** (second adopter)
   - Apply same pattern
   - Update ContactSlide

4. **Migrate usePublications** (third adopter)
   - Apply same pattern
   - Update PublicationSlide

5. **Clean up useVariables** (already mostly compliant)
   - Switch from `cardComponent: () => Component` to `card: Component`
   - Update EntityMappingPanel consumer

6. **Add JSDoc types** (documentation)
   - Add interface documentation to all hooks
   - Add examples in hook files

### Backward Compatibility

**No breaking changes for consumers that only use `items`:**
```jsx
// ✅ Still works
const { items } = useStudies();
```

**Breaking changes (minimal):**
```jsx
// ❌ Old: Won't work anymore
const { getCard } = useStudies();
const Card = getCard();

// ✅ New: Direct access
const { card: Card } = useStudies();
```

**Migration effort:** ~2 hours to update all consumers

---

## 5. Testing Plan

### Unit Tests for CRUD Utilities

**File:** `src/hooks/utils/entityCrudOperations.test.js`

```jsx
import { renderHook, act } from '@testing-library/react-hooks';
import { createEntityOperations } from './entityCrudOperations';

describe('createEntityOperations', () => {
    it('adds item with generated ID', () => {
        const items = [];
        const setItems = jest.fn();
        
        const { addItem } = createEntityOperations(items, setItems);
        
        act(() => {
            addItem({ name: 'Test' });
        });
        
        expect(setItems).toHaveBeenCalledWith(expect.any(Function));
        const updater = setItems.mock.calls[0][0];
        const result = updater([]);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('id');
        expect(result[0].name).toBe('Test');
    });

    it('updates existing item', () => {
        const items = [{ id: '1', name: 'Original' }];
        const setItems = jest.fn();
        
        const { updateItem } = createEntityOperations(items, setItems);
        
        act(() => {
            updateItem({ id: '1', name: 'Updated' });
        });
        
        const updater = setItems.mock.calls[0][0];
        const result = updater(items);
        
        expect(result[0].name).toBe('Updated');
    });

    it('removes item by id', () => {
        const items = [
            { id: '1', name: 'Keep' },
            { id: '2', name: 'Remove' }
        ];
        const setItems = jest.fn();
        
        const { removeItem } = createEntityOperations(items, setItems);
        
        act(() => {
            removeItem('2');
        });
        
        const updater = setItems.mock.calls[0][0];
        const result = updater(items);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });
});
```

### Integration Tests for Hooks

**File:** `src/hooks/useStudies.test.jsx`

```jsx
import { renderHook, act } from '@testing-library/react-hooks';
import { GlobalDataProvider } from '../contexts/GlobalDataContext';
import useStudies from './useStudies';

const wrapper = ({ children }) => (
    <GlobalDataProvider>{children}</GlobalDataProvider>
);

describe('useStudies', () => {
    it('follows standard entity hook interface', () => {
        const { result } = renderHook(() => useStudies(), { wrapper });
        
        // Assert API shape
        expect(result.current).toHaveProperty('items');
        expect(result.current).toHaveProperty('setItems');
        expect(result.current).toHaveProperty('addItem');
        expect(result.current).toHaveProperty('updateItem');
        expect(result.current).toHaveProperty('removeItem');
        expect(result.current).toHaveProperty('card');
        expect(result.current).toHaveProperty('form');
        expect(result.current).toHaveProperty('view');
    });

    it('adds study with default template', () => {
        const { result } = renderHook(() => useStudies(), { wrapper });
        
        act(() => {
            result.current.addItem();
        });
        
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0]).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: '',
            submissionDate: '',
            publicationDate: ''
        });
    });
});
```

---

## 6. Documentation

### Hook Documentation Template

Add to the top of each hook file:

```jsx
/**
 * useStudies - Hook for managing study entities
 * 
 * @example
 * ```jsx
 * const studies = useStudies();
 * 
 * // Add a new study
 * studies.addItem({ name: 'My Study', description: 'Details...' });
 * 
 * // Update an existing study
 * studies.updateItem({ id: '123', name: 'Updated Name' });
 * 
 * // Remove a study
 * studies.removeItem('123');
 * 
 * // Render with card component
 * <studies.card item={study} onSave={studies.updateItem} />
 * ```
 * 
 * @returns {Object} Entity hook interface
 * @returns {Array} items - All studies
 * @returns {Function} addItem - Add new study
 * @returns {Function} updateItem - Update existing study
 * @returns {Function} removeItem - Remove study by ID
 * @returns {Component} card - StudyCard component
 * @returns {Component} form - StudyForm component
 * @returns {Component} view - StudyView component
 */
```

---

## 7. Benefits Summary

### Before Refactoring

| Issue | Impact |
|-------|--------|
| Two different patterns | Mental overhead, easy to make mistakes |
| Duplicate CRUD logic | Code in StudySlide, ContactSlide manually implements add/remove |
| Inconsistent naming | `cardComponent()` vs `getCard()` vs `card` |
| Hard to extend | Adding new entity type requires knowing which pattern to follow |

### After Refactoring

| Improvement | Benefit |
|-------------|---------|
| Single, consistent API | ✅ Learn once, use everywhere |
| Shared CRUD utilities | ✅ 40% less code, easier to test |
| Predictable naming | ✅ `card`, `form`, `view` - always the same |
| EntityMappingPanel works with all hooks | ✅ True polymorphism |
| Easy to extend | ✅ New entity hooks follow clear template |

---

## 8. Review Checklist

Following `promote-reusability.prompt.md`:

- ✅ **Is the API small and documented?** Yes - 8 properties, JSDoc added
- ✅ **Are usage examples provided?** Yes - in this doc and in code comments
- ✅ **Are accessibility concerns addressed?** N/A - this is a data hook, not UI
- ✅ **Are tests added?** Yes - unit tests for utilities, integration tests for hooks
- ✅ **Are 1–3 adoption sites included?** Yes - useStudies, useContacts, usePublications
- ✅ **Is there a migration strategy?** Yes - 6-step incremental rollout
- ✅ **Does it pass lint/build?** To be verified during implementation

---

## 9. Success Criteria

### Functional Requirements

- [ ] All entity hooks return consistent API shape
- [ ] `EntityMappingPanel` works with all hooks without modifications
- [ ] `Collection` component works with all hooks
- [ ] No duplicate CRUD logic in slide components
- [ ] All existing tests pass
- [ ] New tests added for CRUD utilities

### Non-Functional Requirements

- [ ] Code reduction: -100+ lines of duplicate logic
- [ ] Zero performance regression
- [ ] All lint rules pass
- [ ] Documentation updated
- [ ] Team reviewed and approved

---

## 10. Timeline

| Phase | Effort | Deadline |
|-------|--------|----------|
| Create CRUD utilities + tests | 2 hours | Day 1 |
| Migrate useStudies | 1 hour | Day 1 |
| Migrate useContacts | 1 hour | Day 2 |
| Migrate usePublications | 1 hour | Day 2 |
| Update useVariables | 30 min | Day 2 |
| Update consumers | 2 hours | Day 3 |
| Integration testing | 2 hours | Day 3 |
| Documentation | 1 hour | Day 3 |

**Total effort:** ~10 hours over 3 days

---

## Conclusion

This refactoring standardizes entity hooks following your own `promote-reusability.prompt.md` guidelines:
- **Small, single-responsibility** - Each hook manages one entity type
- **Composition over configuration** - Hooks return component references, not configurations
- **Never write the same function twice** - Shared CRUD utilities eliminate duplication
- **Consistent contracts** - All hooks follow same interface

**Impact:** Reduces code by ~100 lines, eliminates 3 sources of duplication, makes system easier to extend and maintain.

**Risk:** Low - Incremental migration, comprehensive tests, minimal breaking changes.

**Recommendation:** ✅ **Approve and implement**
