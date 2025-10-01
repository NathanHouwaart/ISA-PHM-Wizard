# ISA-PHM Wizard - AI Coding Agent Instructions

## Project Overview
ISA-PHM Wizard is a React + Vite application for creating and managing ISA/PHM-style study metadata. It provides tools for creating investigations, selecting test setups, mapping study variables, and exporting structured metadata.

## Architecture & Key Patterns

### Data Management Pattern
- **Central State**: All app data flows through `GlobalDataContext` (`src/contexts/GlobalDataContext.jsx`)
- **Persistence**: Everything auto-saves to localStorage with prefixed keys (`globalAppData_*`)
- **Initial Data**: JSON files in `src/data/` provide defaults (studies, contacts, test setups, etc.)
- **Lazy Loading**: State initialized from localStorage on first load with fallback to JSON defaults

### Mapping System Architecture
The app's core concept is **entity mappings** - relationships between different data types:
- `studyToStudyVariableMapping`: Links studies to variables they measure
- `studyToSensorMeasurementMapping`: Links studies to sensor measurements  
- `sensorToProcessingProtocolMapping`: Links sensors to processing protocols
- `studyToAssayMapping`: Auto-generated assay filenames (pattern: `ST{xx}_SE{yy}_ASSO.csv`)

### Hook-Based Controllers
- **`useMappingsController`**: Generic mapping CRUD operations, configurable for different mapping types
- **`useDataGrid`**: Complex grid interactions with undo/redo, handles both standalone grids and mapping grids
- **Entity Hooks**: Pattern like `useStudies()`, `useContacts()` - wrap GlobalDataContext for specific entities

### Component Architecture
- **`PageWrapper`**: Consistent layout with responsive width control (`screenWidth` in context)
- **`EntityMappingPanel`**: Reusable component for all mapping interfaces (studies↔variables, sensors↔protocols)
- **Slide Components**: Located in `src/components/Slides/` - carousel-style workflow steps
- **Form Fields**: JSON-driven forms using `src/data/*FormFields.json` structures

## Development Workflows

### Local Development
```powershell
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

### Build & Deploy
```powershell
npm run build        # Production build to dist/
npm run deploy       # Deploy to GitHub Pages via gh-pages
npm run preview      # Preview production build locally
```

### Backend Integration
Separate repository: `https://github.com/NathanHouwaart/ISA-PHM-Backend`
API calls handled in `src/services/api.js` (currently minimal - only license fetching)

## Key File Patterns

### Data Structure Files (`src/data/`)
- Follow JSON array format for entities: `[{id, name, ...}, ...]`
- Mapping files use format: `[{sourceId, targetId, value}, ...]`
- Form field definitions include validation, examples, cardinality

### Hook Conventions
- Entity hooks return: `{items, updateItem, addItem, removeItem, cardComponent}`
- Always use `useGlobalDataContext()` to access/update state
- Mapping updates use immutable patterns with spread operators

### Component Patterns
- Import GlobalDataContext via `useGlobalDataContext()` hook
- Page components wrapped in `<PageWrapper widthClass="optional-override">`
- Entity lists use consistent card-based UI with edit/delete actions

## Critical Dependencies
- **@revolist/react-datagrid**: Advanced data grid with editing capabilities
- **@radix-ui/***: Accessible UI primitives (dialogs, tooltips, switches)
- **react-router-dom**: Client-side routing
- **tailwindcss**: Utility-first CSS framework
- **uuid**: Generate unique IDs for new entities

## Debugging Notes
- All state changes auto-save to localStorage - check browser DevTools Application tab
- Mapping operations are complex - use `useMappingsController` rather than direct state manipulation
- Grid interactions support undo/redo - be aware of history state when debugging
- Cross-origin iframe embedding may fail due to CSP - fallback patterns implemented

## Common Gotchas
- Always use absolute IDs for entity references (UUIDs), never array indices
- Mapping updates require both source and target IDs to identify the relationship
- PageWrapper responsive width controlled globally - test on multiple screen sizes
- LocalStorage can become stale - clear `globalAppData_*` keys when debugging data issues