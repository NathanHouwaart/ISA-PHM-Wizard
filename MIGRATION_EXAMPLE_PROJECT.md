# Migration to isa-project-example.json Baseline

## Overview
This document describes the minimal changes made to use `isa-project-example.json` as the baseline for the example project, ensure new user projects are blank, and fix export/import to include test setups.

## Changes Made

### 1. GlobalDataContext.jsx - Example Project Baseline

**Changed:**
- Renamed `DEFAULT_PROJECT_ID` from `'default'` to `'example-project'`
- Renamed `DEFAULT_PROJECT_NAME` from `'Default Project'` to `'Example Project'`
- Imported `isa-project-example.json` as the baseline data source
- Removed imports of individual JSON files (existingStudies.json, existingContacts.json, etc.)

**Added:**
- `getDefaultValue(key, isEmpty)` helper function:
  - Returns baseline data from `isa-project-example.json` for the example project
  - Returns empty arrays/objects for new user-created projects
- Updated state initialization to use `getDefaultValue()` with `isEmpty` flag based on whether `currentProjectId !== DEFAULT_PROJECT_ID`

**Updated Functions:**
- `resetProject(id)`: Now checks if project is example project and uses appropriate baseline (isa-project-example.json) or empty defaults
- `switchProject(id)`: Uses `getDefaultValue()` to load correct baseline per project type

### 2. indexedTreeStore.js - Database Migration

**Changed:**
- Migration function now uses `'example-project'` instead of `'default'` when migrating old DB records
- Updated all function default parameters from `'default'` to `'example-project'`:
  - `saveTree(rootNode, projectId = 'example-project')`
  - `loadTree(projectId = 'example-project')`
  - `loadSubtree(path, projectId = 'example-project')`
  - `clearTree(projectId = 'example-project')`
  - `exportProject(projectId = 'example-project')`

**Note:** Test setup is already included in export/import via the localStorage persistence mechanism (stored as `globalAppData_${projectId}_testSetups`). No additional changes needed.

## Behavior Changes

### Fresh Incognito Tab (No localStorage)
1. Creates one initial project with ID `'example-project'` and name `'Example Project'`
2. Loads baseline data from `isa-project-example.json`:
   - Studies, contacts, publications, test setups
   - Study variables, measurement protocols, processing protocols
   - All mappings (study↔variable, sensor↔protocol, study↔sensor, etc.)
3. User can edit this project but cannot delete it (protected)
4. User can reset it back to baseline via "Reset" button

### New User-Created Projects
1. Start with completely empty state:
   - Empty arrays for: studies, contacts, publications, testSetups, studyVariables, measurementProtocols, processingProtocols
   - Empty mappings
   - Blank investigations form
2. User builds from scratch without any pre-populated data

### Example Project Protection
- Cannot be deleted (deletion blocked with alert)
- Can be edited
- Can be reset to original `isa-project-example.json` baseline
- Reset button (RefreshCw icon) appears instead of delete button in ProjectSessionsModal

## Backward Compatibility
- Existing users with old `'default'` project ID will have their IndexedDB data migrated to `'example-project'` automatically
- localStorage keys remain unchanged in structure (`globalAppData_${projectId}_key`)
- Export/import format unchanged (already included testSetup via localStorage)

## Testing Checklist
- [ ] Fresh incognito tab shows one example project with isa-project-example.json data
- [ ] Example project cannot be deleted (alert shown)
- [ ] Example project can be reset to baseline
- [ ] New user projects start with empty arrays/objects
- [ ] Switching between example project and new project loads correct data
- [ ] Export includes testSetup (verify `globalAppData_${projectId}_testSetups` in exported JSON)
- [ ] Import restores testSetup correctly
- [ ] Existing users' data migrated from 'default' to 'example-project' successfully
