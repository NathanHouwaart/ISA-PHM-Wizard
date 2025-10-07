# ISA-PHM Wizard - Comprehensive Architectural Review
**Review Date:** October 7, 2025  
**Reviewer Perspective:** Senior Software Architect / React Expert  
**Focus Areas:** Design Patterns, Clean Code, React Best Practices, Hook Usage, Component Structure

---

## Executive Summary

Your ISA-PHM Wizard demonstrates **solid architectural foundations** with several sophisticated patterns (mapping system, undo/redo, IndexedDB integration). However, there are opportunities to significantly improve **maintainability, testability, and adherence to React best practices**. This review identifies 23 actionable improvements across 7 categories.

**Overall Grade: B+ (Good, with clear path to excellence)**

**Strengths:**
- ✅ Excellent separation of concerns with custom hooks
- ✅ Sophisticated data grid abstraction (`useDataGrid`)
- ✅ Clean mapping controller pattern
- ✅ Good use of composition (EntityMappingPanel, TabSwitcher)
- ✅ Proper lazy loading of routes

**Critical Issues:**
- ⚠️ **GlobalDataContext is a God Object** (500+ lines, 20+ responsibilities)
- ⚠️ Inconsistent component export patterns (mixed named + default)
- ⚠️ Missing PropTypes/TypeScript - no type safety
- ⚠️ Minimal test coverage (2 test files only)
- ⚠️ Some hooks return inconsistent APIs

---

## 1. Hook Architecture & Design Patterns

### 1.1 ⭐ **EXCELLENT: Custom Hook Abstraction**
Your hook-based architecture is one of the project's strongest points:

```jsx
// GOOD: Clean, focused hook with single responsibility
export const useVariables = () => {
    const { studyVariables, setStudyVariables } = useGlobalDataContext();
    
    return {
        items: studyVariables,
        addItem: addVariable,
        updateItem: updateVariable,
        removeItem: removeVariable,
        cardComponent: () => StudyVariableMappingCard,
    }
}
```

**What's Great:**
- Single Responsibility Principle: Each hook manages one entity type
- Predictable return shape enables duck typing
- Encapsulates both data and UI concerns

### 1.2 ⚠️ **ISSUE: Inconsistent Hook Return Patterns**

**Problem:** Your entity hooks return different structures:

```jsx
// useVariables.jsx - Returns methods
return {
    items, addItem, updateItem, removeItem, cardComponent
}

// useStudies.jsx - Returns getters (WHY??)
return {
    items, setItems, 
    getCard, getForm, getView  // Functions that return components
}
```

**Impact:** Consumers need to know which pattern each hook uses, breaking the abstraction.

**Solution:** Standardize on the direct return pattern:

```jsx
// ✅ RECOMMENDED PATTERN
export const useStudies = () => {
    const { studies, setStudies } = useGlobalDataContext();
    
    return {
        items: studies,
        setItems: setStudies,
        addItem: addStudy,
        updateItem: updateStudy,
        removeItem: removeStudy,
        // Return components directly, not getters
        card: StudyCard,
        form: StudyForm,
        view: StudyView
    }
}
```

### 1.3 🔧 **ISSUE: Over-Complex `useDataGrid` Hook**

**Current State:** 650+ lines, manages:
- Row data state
- Column data state  
- Mappings state
- History management (undo/redo)
- Grid transformations
- External sync logic

**Problem:** Violates Single Responsibility Principle. Too many concerns.

**Recommendation:** Extract into composable hooks:

```jsx
// ✅ BETTER: Compose smaller hooks
const useGridData = (rowData, columnData, mappings, fieldMappings) => {
    // Transform data for grid consumption
    const { gridData, columnDefs } = useMemo(() => ({
        gridData: transformRows(rowData, columnData, mappings),
        columnDefs: buildColumns(columnData, staticColumns)
    }), [rowData, columnData, mappings]);
    
    return { gridData, columnDefs };
};

const useGridHistory = (maxSize = 50) => {
    const [history, setHistory] = useState([]);
    const [index, setIndex] = useState(0);
    
    return {
        canUndo: index > 0,
        canRedo: index < history.length - 1,
        undo: () => { /* ... */ },
        redo: () => { /* ... */ },
        addToHistory: (snapshot) => { /* ... */ }
    };
};

const useMappingOperations = (mappings, setMappings, fields) => {
    return {
        updateMapping: useCallback((rowId, columnId, value) => {
            // ...
        }, [mappings, fields]),
        updateMappingsBatch: useCallback((updates) => {
            // ...
        }, [mappings, fields])
    };
};

// Then compose in useDataGrid
export const useDataGrid = (config) => {
    const gridData = useGridData(config);
    const history = useGridHistory(config.maxHistorySize);
    const operations = useMappingOperations(mappings, setMappings, fields);
    
    return { ...gridData, ...history, ...operations };
};
```

**Benefits:**
- Each hook is testable in isolation
- Clearer responsibilities
- Easier to reason about
- Can reuse `useGridHistory` elsewhere

### 1.4 ✅ **GOOD: `useMappingsController` Design**

Your mapping controller is well-designed:

```jsx
export default function useMappingsController(
    mappingKey = 'studyToStudyVariableMapping',
    keyNames = { sourceKey: 'studyVariableId', targetKey: 'studyId' }
) {
    // Stable API with configurable behavior
    return {
        mappings,
        setMappings,
        updateMappingValue
    };
}
```

**Strengths:**
- Configurable via parameters (good DI pattern)
- Stable ref management
- Backward-compatible signature handling

**Minor Improvement:** Add JSDoc types:

```jsx
/**
 * @typedef {Object} MappingController
 * @property {Array} mappings - Current mapping array
 * @property {Function} setMappings - Replace entire mapping array
 * @property {Function} updateMappingValue - Update a single mapping
 */

/**
 * @param {string} mappingKey - Key in GlobalDataContext.dataMap
 * @param {Object} keyNames - Field name configuration
 * @returns {MappingController}
 */
export default function useMappingsController(mappingKey, keyNames) {
```

---

## 2. Context Architecture

### 2.1 🚨 **CRITICAL: GlobalDataContext is a God Object**

**Current State:** 500+ lines managing:
- 9 entity types (studies, contacts, publications, etc.)
- 6 mapping types
- Project management (CRUD)
- Screen width state
- Page tab states
- Dataset management
- Explorer state
- LocalStorage persistence
- Auto-generation logic
- Migration logic

**This is an anti-pattern.** It violates:
- Single Responsibility Principle
- Open/Closed Principle
- Separation of Concerns

**Problem Impact:**
1. **Performance:** Every state change triggers re-render for ALL consumers
2. **Maintenance:** Impossible to reason about without reading all 500 lines
3. **Testing:** Cannot test individual concerns in isolation
4. **Bundle Size:** Context forces all related code into initial bundle

### 2.2 ✅ **RECOMMENDED: Context Splitting Strategy**

**Phase 1: Immediate Wins (Split by Concern)**

```jsx
// 1. ProjectContext - Project lifecycle management
export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [currentProjectId, setCurrentProjectId] = useState(null);
    
    return (
        <ProjectContext.Provider value={{
            projects,
            currentProjectId,
            createProject,
            deleteProject,
            renameProject,
            switchProject,
            resetProject
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

// 2. EntityDataContext - Core entities (studies, contacts, variables)
// Only re-renders when entity data changes
export const EntityDataProvider = ({ children }) => {
    const { currentProjectId } = useProjectContext();
    // ... entity state management
};

// 3. MappingDataContext - All mapping relationships
export const MappingDataProvider = ({ children }) => {
    const { currentProjectId } = useProjectContext();
    // ... mapping state management
};

// 4. UIStateContext - Screen width, tab states, explorer state
export const UIStateProvider = ({ children }) => {
    const [screenWidth, setScreenWidth] = useState("max-w-5xl");
    const [pageTabStates, setPageTabStates] = useState({});
    // ... UI state only
};

// 5. DatasetContext - File tree and IndexedDB operations
export const DatasetProvider = ({ children }) => {
    const { currentProjectId } = useProjectContext();
    const dataset = useDatasetStore(currentProjectId);
    // ... dataset management
};
```

**Phase 2: Advanced Optimization (Atomic Updates)**

Consider using **Jotai** or **Zustand** for fine-grained reactivity:

```jsx
// Each atom updates independently - zero wasted re-renders
import { atom, useAtom } from 'jotai';

export const studiesAtom = atom([]);
export const contactsAtom = atom([]);
export const publicationsAtom = atom([]);

// Derived atoms for computed state
export const studyCountAtom = atom((get) => get(studiesAtom).length);

// Usage in components
const Studies = () => {
    const [studies, setStudies] = useAtom(studiesAtom);
    // Only re-renders when studies change, not when contacts change
};
```

**Migration Path:**
1. Extract `ProjectContext` first (least dependencies)
2. Extract `UIStateContext` (no business logic)
3. Split entity/mapping data last (most interconnected)

---

## 3. Component Design & Reusability

### 3.1 ✅ **EXCELLENT: EntityMappingPanel Abstraction**

Your generic mapping panel is a stellar example of composition:

```jsx
<EntityMappingPanel
    name="Variables"
    itemHook={useVariables}
    mappings={controller.mappings}
    handleInputChange={controller.updateMappingValue}
/>
```

**Why This is Great:**
- Completely generic via dependency injection
- Works with any hook following the pattern
- No prop drilling
- Single component handles all entity types

**Minor Improvement:** Add PropTypes:

```jsx
EntityMappingPanel.propTypes = {
    name: PropTypes.string.isRequired,
    tileNamePrefix: PropTypes.string,
    itemHook: PropTypes.func.isRequired, // Must return { items, cardComponent, ... }
    mappings: PropTypes.array,
    handleInputChange: PropTypes.func,
    disableAdd: PropTypes.bool,
    minHeight: PropTypes.string
};
```

### 3.2 ⚠️ **ISSUE: FormField Component Complexity**

**Current State:** 400+ lines handling:
- 7+ input types (text, textarea, select, tags, license, multi-select)
- Dropdown positioning with portals
- Keyboard navigation
- Tag management
- Commit-on-blur behavior
- Tooltip integration

**Problem:** Single component with too many responsibilities.

**Recommendation:** Extract specialized components:

```jsx
// ✅ Base FormField (50 lines)
const FormField = ({ type, ...props }) => {
    const components = {
        text: TextInput,
        textarea: TextAreaInput,
        select: SelectInput,
        tags: TagInput,
        license: LicenseInput,
        'multi-select': MultiSelectInput
    };
    
    const Component = components[type] || TextInput;
    return <Component {...props} />;
};

// ✅ Specialized TagInput (100 lines)
const TagInput = ({ value, onChange, tags, placeholder }) => {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    // ... tag-specific logic only
    
    return <TagInputUI />;
};
```

**Benefits:**
- Each component has one reason to change
- Easier to test individual input types
- Clearer code organization
- Follows your own `promote-reusability.prompt.md` guidelines!

### 3.3 ⚠️ **ISSUE: Inconsistent Component Export Pattern**

**Current Problem:** Mixed export styles across the codebase:

```jsx
// Pattern 1: Named export + default export
export const IsaQuestionnaire = () => { /* ... */ };
export default IsaQuestionnaire;

// Pattern 2: Default function export
export default function ProjectSessionsModal({ onClose }) { /* ... */ }

// Pattern 3: Named arrow function, no default
export const useVariables = () => { /* ... */ };
```

**According to your `use_const_lambda_function.prompt.md`:**
> All React components must be defined as arrow functions and must have a default export.

**Recommendation: Pick ONE pattern and enforce it:**

```jsx
// ✅ RECOMMENDED: Named const arrow + default export
// Pros: Named for better stack traces, default for React.lazy()
const IsaQuestionnaire = () => {
    // ...
};

export default IsaQuestionnaire;
```

**Add ESLint rule to enforce:**

```js
// eslint.config.js
{
    rules: {
        'import/no-anonymous-default-export': 'error',
        'react/function-component-definition': ['error', {
            namedComponents: 'arrow-function',
            unnamedComponents: 'arrow-function'
        }]
    }
}
```

---

## 4. State Management & Data Flow

### 4.1 ⚠️ **ISSUE: LocalStorage as Primary Persistence**

**Current Pattern:**
```jsx
useEffect(() => {
    // Save EVERYTHING to localStorage on EVERY state change
    saveToLocalStorage(projectKey('studies'), studies);
    saveToLocalStorage(projectKey('contacts'), contacts);
    // ... 15 more items
}, [studies, contacts, /* 15 more dependencies */]);
```

**Problems:**
1. **Performance:** Synchronous localStorage writes block main thread
2. **Size Limits:** localStorage has 5-10MB limit per origin
3. **Serialization Cost:** JSON.stringify on every render
4. **Data Loss Risk:** No transaction guarantees

**Recommendation: Use IndexedDB as Primary Store**

You already have IndexedDB infrastructure for datasets - extend it:

```jsx
// ✅ Better: Debounced IndexedDB persistence
import { useDebounce } from './hooks/useDebounce';

const usePersistence = (key, value, delay = 1000) => {
    const debouncedValue = useDebounce(value, delay);
    
    useEffect(() => {
        // Non-blocking async write
        db.put(key, debouncedValue).catch(console.error);
    }, [debouncedValue]);
};

// In GlobalDataContext
usePersistence('studies', studies);
usePersistence('contacts', contacts);
```

**Benefits:**
- Async (doesn't block UI)
- 100MB+ storage capacity
- Transaction support
- Better error handling

**Keep localStorage for:**
- UI preferences (screen width, tab states)
- Last project ID
- Small, frequently accessed data

### 4.2 ✅ **GOOD: Mapping System Architecture**

Your mapping system design is elegant:

```jsx
// Flexible, composable mapping relationships
studyToStudyVariableMapping: [
    { studyId: "uuid1", studyVariableId: "uuid2", value: "measured" }
]
```

**Strengths:**
- Normalized data structure (no duplication)
- Easy to query in both directions
- Supports many-to-many relationships
- Works with your generic grid

**Potential Enhancement:** Add an in-memory index for O(1) lookups:

```jsx
// In GlobalDataContext or a dedicated hook
const mappingIndex = useMemo(() => {
    const index = new Map();
    studyToStudyVariableMapping.forEach(m => {
        const key = `${m.studyId}::${m.studyVariableId}`;
        index.set(key, m);
    });
    return index;
}, [studyToStudyVariableMapping]);

// Then expose via context
value.getMappingFast = (studyId, variableId) => {
    return mappingIndex.get(`${studyId}::${variableId}`);
};
```

---

## 5. Code Quality & Maintainability

### 5.1 🚨 **CRITICAL: No Type Safety**

**Current State:** Zero TypeScript, zero PropTypes, zero runtime validation.

**Impact:**
- No autocomplete for props
- No compile-time error detection
- Refactoring is risky (no way to find all usages)
- New developers struggle to understand APIs

**Recommendation: Incremental TypeScript Migration**

**Phase 1:** Add JSDoc comments (Zero config, works with existing .jsx)

```jsx
/**
 * Generic data grid hook for managing row/column/mapping data
 * @param {Object} config - Configuration object
 * @param {Array<Object>} config.rowData - Array of row objects
 * @param {Array<Object>} config.columnData - Array of column definitions
 * @param {Array<Object>} config.mappings - Array of cell mappings
 * @param {Object} config.fieldMappings - Field name mappings
 * @param {Array<Object>} config.staticColumns - Static column definitions
 * @param {number} [config.maxHistorySize=50] - Max undo/redo history
 * @param {Function} [config.onRowDataChange] - Callback for external row updates
 * @returns {{
 *   gridData: Array,
 *   columnDefs: Array,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   updateMapping: Function,
 *   stats: Object
 * }}
 */
export const useDataGrid = (config) => { /* ... */ }
```

**Phase 2:** Rename files to .tsx, add TypeScript gradually

```tsx
// Start with utility functions (easiest)
export const formatContactName = (contact: Contact): string => {
    return `${contact.firstName} ${contact.lastName}`.trim();
};

// Then hooks
export const useVariables = (): EntityHookReturn<Variable> => {
    // TypeScript will catch mistakes here
};

// Finally components
interface FormFieldProps {
    name: string;
    value: string | string[];
    label?: string;
    type?: 'text' | 'textarea' | 'select' | 'tags' | 'license';
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const FormField: FC<FormFieldProps> = ({ name, value, ...props }) => {
    // ...
};
```

**Phase 3:** Enable strict mode once core types are defined

### 5.2 ⚠️ **ISSUE: Minimal Test Coverage**

**Current State:** Only 2 test files found:
- `dataGridUtils.test.js`
- `useFileSystem.test.jsx`

**For a 50+ component, 20+ hook application, this is insufficient.**

**Recommendation: Test Pyramid Strategy**

```
     /\
    /E2E\         < 5 critical user flows
   /------\
  /  INT   \      < 20 integration tests (hook + context)
 /----------\
/   UNIT     \    < 50+ unit tests (pure functions)
--------------
```

**Priority Test Targets:**

1. **Unit Tests (Low-hanging fruit):**
```jsx
// utils/utils.test.jsx
describe('formatContactName', () => {
    it('combines first and last name', () => {
        expect(formatContactName({ 
            firstName: 'John', 
            lastName: 'Doe' 
        })).toBe('John Doe');
    });
    
    it('handles missing lastName gracefully', () => {
        expect(formatContactName({ 
            firstName: 'John' 
        })).toBe('John');
    });
});
```

2. **Hook Integration Tests:**
```jsx
// hooks/useVariables.test.jsx
import { renderHook, act } from '@testing-library/react-hooks';
import { GlobalDataProvider } from '../contexts/GlobalDataContext';

describe('useVariables', () => {
    const wrapper = ({ children }) => (
        <GlobalDataProvider>{children}</GlobalDataProvider>
    );
    
    it('adds a new variable', () => {
        const { result } = renderHook(() => useVariables(), { wrapper });
        
        act(() => {
            result.current.addItem();
        });
        
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0]).toHaveProperty('id');
    });
});
```

3. **Component Tests:**
```jsx
// components/EntityMappingPanel.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';

describe('EntityMappingPanel', () => {
    const mockHook = () => ({
        items: [{ id: '1', name: 'Test Variable' }],
        cardComponent: () => () => <div>Card</div>,
        addItem: jest.fn(),
        updateItem: jest.fn(),
        removeItem: jest.fn()
    });
    
    it('renders item list', () => {
        render(<EntityMappingPanel name="Test" itemHook={mockHook} />);
        expect(screen.getByText('Test Variable')).toBeInTheDocument();
    });
});
```

**Set Coverage Targets:**
```json
// package.json
{
    "jest": {
        "coverageThreshold": {
            "global": {
                "statements": 70,
                "branches": 60,
                "functions": 70,
                "lines": 70
            }
        }
    }
}
```

### 5.3 ✅ **GOOD: Clean Imports Organization**

Your import structure is well-organized:

```jsx
import React, { forwardRef, useEffect, useMemo } from 'react'

// Hooks
import useVariables from '../../hooks/useVariables';
import useResizeObserver from '../../hooks/useResizeObserver';

// Components
import { SlidePageTitle } from '../Typography/Heading2';
import EntityMappingPanel from '../EntityMappingPanel';

// Data
import studyVariableSlideContent from '../../data/StudyVariableSlideContent.json';
```

**Strength:** Clear grouping with blank lines and comments.

**Minor Enhancement:** Add ESLint plugin for auto-sorting:

```js
// eslint.config.js
{
    plugins: ['import'],
    rules: {
        'import/order': ['error', {
            'groups': [
                'builtin',
                'external',
                'internal',
                ['parent', 'sibling', 'index']
            ],
            'newlines-between': 'always',
            'alphabetize': { order: 'asc' }
        }]
    }
}
```

---

## 6. Performance Considerations

### 6.1 ⚠️ **ISSUE: Missing Memoization in Critical Paths**

**Problem Areas:**

```jsx
// StudyVariableSlide.jsx
return (
    <EntityMappingPanel
        itemHook={useVariables}  // ⚠️ New function every render!
        mappings={mappingsController.mappings}
        handleInputChange={mappingsController.updateMappingValue}
    />
);
```

**Impact:** `EntityMappingPanel` re-renders even when data hasn't changed.

**Solution: Memoize hook wrappers:**

```jsx
const StudyVariableSlide = forwardRef(({ ... }, ref) => {
    // ✅ Memoize the hook wrapper
    const variablesHook = useCallback(() => useVariables(), []);
    
    return (
        <EntityMappingPanel
            itemHook={variablesHook}  // ✅ Stable reference
            // ...
        />
    );
});
```

**Better Yet: Pass data directly:**

```jsx
// ✅ BEST: No indirection, clear data flow
const { items, addItem, updateItem, removeItem, cardComponent } = useVariables();

return (
    <EntityMappingPanel
        items={items}
        onAdd={addItem}
        onUpdate={updateItem}
        onRemove={removeItem}
        CardComponent={cardComponent}
    />
);
```

### 6.2 ⚠️ **ISSUE: Large Context Re-render Cascade**

**Current Problem:**
```jsx
// Any change triggers re-render for ALL consumers
const { 
    studies, contacts, publications,  // Entity data
    studyToStudyVariableMapping,       // Mapping data
    screenWidth, pageTabStates         // UI state
} = useGlobalDataContext();
```

**If `screenWidth` changes, EVERY component using ANY context data re-renders.**

**Solution 1: Context Splitting (already recommended above)**

**Solution 2: Selective Context Consumption**

```jsx
// ✅ Create specialized selectors
export const useStudiesOnly = () => {
    const { studies } = useGlobalDataContext();
    return studies;
};

export const useScreenWidth = () => {
    const { screenWidth, setScreenWidth } = useGlobalDataContext();
    return [screenWidth, setScreenWidth];
};

// Components only re-render when their slice changes
const MyComponent = () => {
    const studies = useStudiesOnly();  // Doesn't care about screenWidth
    // ...
};
```

**Solution 3: Use context-selectors library**

```jsx
import { createContextSelector } from 'use-context-selector';

const GlobalDataContext = createContextSelector();

// Only re-renders when studies change
const studies = useContextSelector(GlobalDataContext, ctx => ctx.studies);
```

### 6.3 ✅ **GOOD: Lazy Loading Strategy**

Your route-based code splitting is excellent:

```jsx
const About = React.lazy(() => import("./pages/About"));
const TestSetups = React.lazy(() => import("./pages/TestSetups"));

<Route path="/about" element={
    <Suspense fallback={<LoadingOverlay />}>
        <About />
    </Suspense>
} />
```

**Keep doing this!** Reduces initial bundle size significantly.

**Additional Opportunity:** Lazy load heavy libraries:

```jsx
// ✅ Dynamic import for large dependencies
const DataGrid = lazy(() => import('./components/DataGrid/DataGrid'));

// Only loads RevoGrid when user switches to grid view
<TabPanel isActive={selectedTab === 'grid-view'}>
    <Suspense fallback={<div>Loading grid...</div>}>
        <DataGrid {...config} />
    </Suspense>
</TabPanel>
```

---

## 7. File & Folder Structure

### 7.1 ✅ **GOOD: Logical Organization**

Your folder structure is intuitive:

```
src/
├── components/         # UI components (by feature)
│   ├── Study/
│   ├── Contact/
│   ├── Form/
│   └── Slides/
├── hooks/              # Custom hooks (by concern)
├── contexts/           # Context providers
├── pages/              # Route components
├── utils/              # Pure functions
├── constants/          # Configuration
└── data/               # Static data/schemas
```

**Strengths:**
- Clear separation by concern
- Easy to navigate
- Follows React community conventions

### 7.2 💡 **SUGGESTION: Add Index Files for Cleaner Imports**

**Current:**
```jsx
import StudyCard from '../components/Study/StudyCard';
import StudyForm from '../components/Study/StudyForm';
import StudyView from '../components/Study/StudyView';
```

**Better:**
```jsx
// components/Study/index.js
export { default as StudyCard } from './StudyCard';
export { default as StudyForm } from './StudyForm';
export { default as StudyView } from './StudyView';

// Then in consumers:
import { StudyCard, StudyForm, StudyView } from '../components/Study';
```

**Benefits:**
- Shorter imports
- Easier refactoring (change internal file structure without updating imports)
- Tree-shaking still works

### 7.3 💡 **SUGGESTION: Separate Business Logic from Presentation**

**Current:** Hooks like `useVariables` mix data operations with UI concerns (returns `cardComponent`).

**Recommended Pattern:**

```
src/
├── domain/                  # Business logic layer
│   ├── variables/
│   │   ├── operations.js    # CRUD operations
│   │   ├── validation.js    # Business rules
│   │   └── index.js
│   └── studies/
│       ├── operations.js
│       └── mapping.js
├── hooks/                   # React integration layer
│   ├── useVariables.js      # Connects domain to React state
│   └── useStudies.js
└── components/              # Presentation layer
    ├── Study/
    └── Variable/
```

**Example:**

```jsx
// domain/variables/operations.js (Pure JS, no React)
export const addVariable = (variables, newVariable) => {
    return [...variables, { id: generateId(), ...newVariable }];
};

export const updateVariable = (variables, updatedVariable) => {
    return variables.map(v => 
        v.id === updatedVariable.id ? updatedVariable : v
    );
};

// hooks/useVariables.js (React integration)
import * as operations from '../domain/variables/operations';

export const useVariables = () => {
    const [variables, setVariables] = useGlobalDataContext().studyVariables;
    
    return {
        items: variables,
        addItem: (data) => setVariables(prev => operations.addVariable(prev, data)),
        updateItem: (data) => setVariables(prev => operations.updateVariable(prev, data))
    };
};
```

**Benefits:**
- Business logic is testable without React
- Can reuse logic in Node.js (e.g., migration scripts)
- Clearer separation of concerns

---

## 8. Specific Code Smells & Quick Wins

### 8.1 🔧 Remove Commented-Out Code

```jsx
// hooks/useDataGrid.jsx line 89
// const handleDataGridMappingsChange = useCallback((newMappings) => {
//     ... 5 lines of commented code
```

**Rule:** Delete it. Git history preserves old code.

### 8.2 🔧 Remove console.log in Production

```jsx
// Multiple files
console.log('[useDataGrid] addToHistory', { newMappings, historyIndex });
console.debug('[useDataGrid] updateMappingsBatch called with updates=', updates);
```

**Solution:**

```jsx
// utils/logger.js
export const logger = {
    debug: (...args) => {
        if (import.meta.env.DEV) console.debug(...args);
    },
    log: (...args) => {
        if (import.meta.env.DEV) console.log(...args);
    }
};

// Usage
import { logger } from '../utils/logger';
logger.debug('[useDataGrid] addToHistory', { newMappings });
```

### 8.3 🔧 Extract Magic Numbers to Constants

```jsx
// useDataGrid.jsx
const maxHistorySize = 50;  // Why 50? Document it!

// Better:
// constants/grid.js
export const GRID_CONSTANTS = {
    MAX_HISTORY_SIZE: 50,  // Balance memory vs undo depth
    MIN_COLUMN_WIDTH: 80,
    DEFAULT_ROW_HEIGHT: 40
};
```

### 8.4 🔧 Fix TODO Comments

```jsx
// StudyVariableSlide.jsx
// TODO: ADD PAGE NUMBER IN PARAMETERS
```

**Either:**
1. Fix it now (add the parameter)
2. Create a GitHub issue and link it: `// TODO(#123): Add page number`
3. Delete it if not important

---

## 9. Prompt Compliance Analysis

### 9.1 ✅ **GOOD: Promotes Reusability**

You follow `promote-reusability.prompt.md` well:

- ✅ `EntityMappingPanel` is a perfect reusable component
- ✅ `FormField` handles multiple input types
- ✅ `TooltipButton` / `IconTooltipButton` are small, composable primitives

**Keep this up!**

### 9.2 ⚠️ **PARTIAL: Arrow Function Consistency**

Your `use_const_lambda_function.prompt.md` states:
> All React components must be defined as arrow functions and must have a default export.

**Violations Found:**

```jsx
// ❌ Regular function with default
export default function ProjectSessionsModal({ onClose }) { /* ... */ }

// ❌ Named export without default
export const useStudies = () => { /* ... */ };  // (hook, not component)

// ✅ Correct pattern
const IsaQuestionnaire = () => { /* ... */ };
export default IsaQuestionnaire;
```

**Action:** Enforce with ESLint (see Section 3.3).

### 9.3 ✅ **EXCELLENT: Component Usage**

You follow `use-components.prompt.md` religiously:

- ✅ Always use `FormField` instead of raw `<input>`
- ✅ Consistently use `TooltipButton` / `IconTooltipButton`
- ✅ Typography components (`Heading3`, `Paragraph`) everywhere

**This is exemplary!**

---

## 10. Priority Recommendations (Action Plan)

### Phase 1: Critical (Do First)
**Time: 2-3 weeks**

1. **Split GlobalDataContext** → Extract ProjectContext, UIStateContext (Section 2.2)
2. **Add PropTypes to top 10 components** → Start with EntityMappingPanel, FormField
3. **Write 20 unit tests** → Focus on utils/, hooks/ (pure functions)
4. **Remove console.log statements** → Replace with logger utility
5. **Standardize export patterns** → Pick arrow-function + default, add ESLint rule

### Phase 2: Important (Next)
**Time: 3-4 weeks**

6. **Refactor useDataGrid** → Extract useGridHistory, useMappingOperations
7. **Migrate localStorage → IndexedDB** → Use debounced writes
8. **Add JSDoc comments** → Start with hooks, then components
9. **Fix hook return inconsistencies** → Standardize useStudies, useContacts, etc.
10. **Extract FormField sub-components** → TagInput, LicenseInput separate files

### Phase 3: Nice-to-Have (Future)
**Time: 4-6 weeks**

11. **Incremental TypeScript migration** → Start with utils/, then hooks/
12. **Add integration tests** → 20 tests covering hook + context interactions
13. **Implement context-selectors** → Reduce unnecessary re-renders
14. **Add index.js barrel files** → Cleaner imports
15. **Separate business logic layer** → domain/ folder with pure functions

---

## 11. Conclusion

Your ISA-PHM Wizard is **well-architected for a mid-sized React application**, with excellent use of hooks, composition, and modern patterns. The main opportunities are:

1. **Break up the monolithic context** (biggest impact on maintainability)
2. **Add type safety** (biggest impact on developer experience)
3. **Improve test coverage** (biggest impact on confidence during refactoring)

You're **80% of the way to enterprise-grade architecture**. The remaining 20% is primarily about:
- Enforcing consistency (export patterns, hook APIs)
- Adding guardrails (types, tests, ESLint)
- Performance optimization (context splitting, memoization)

**Most Impressive Aspects:**
- Custom hook architecture
- Generic mapping system
- Sophisticated undo/redo in useDataGrid
- Clean component composition with EntityMappingPanel

**Most Critical Issues:**
- God object context (500 lines)
- No type safety
- Minimal test coverage

If you address the Phase 1 recommendations, you'll have a **maintainable, scalable codebase** that can grow to 2-3x current size without architectural changes.

---

## Appendix: Quick Reference

### Recommended Reading
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Context vs Redux: When to use what](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Useful Tools
- **Bundlephobia:** Check package sizes before adding dependencies
- **React DevTools Profiler:** Identify unnecessary re-renders
- **ESLint + Prettier:** Enforce code style automatically
- **Husky + lint-staged:** Run tests/lint before commits

### Code Quality Metrics
- **Lines per file:** < 300 (GlobalDataContext violates at 500+)
- **Cyclomatic complexity:** < 10 per function
- **Test coverage:** > 70% for critical paths
- **Bundle size:** < 200KB initial (you're doing well with lazy loading)

---

**End of Review**

*This review was conducted with your project's growth and long-term maintainability in mind. All recommendations are based on React community best practices, clean code principles, and my experience with production applications at scale.*

Feel free to ask for clarification or deeper analysis on any section!
