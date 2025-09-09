/**
 * EXAMPLE: Complete RevoGrid Implementation with Normalized State
 * 
 * This file shows how to use RevoGrid in React with normalized state and richer mappings.
 * It demonstrates the complete solution to the StackOverflow question.
 */

import React, { useState, useMemo } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';

// Example data structure - exactly as described in your question
const EXAMPLE_STUDIES = [
  { id: "study-1", name: "Study 1" },
  { id: "study-2", name: "Study 2" },
];

const EXAMPLE_VARIABLES = [
  { id: "var-1", name: "Fault Type" },
  { id: "var-2", name: "Fault Severity", unit: "%" },
];

const EXAMPLE_MAPPINGS = [
  {
    studyId: "study-1",
    studyVariableId: "var-1",
    values: { raw: "BPFO" }
  },
  {
    studyId: "study-1",
    studyVariableId: "var-2",
    values: { raw: "1", normalized: "0.01", unit: "%" }
  },
  {
    studyId: "study-2",
    studyVariableId: "var-2",
    values: { raw: "2", normalized: "0.02", unit: "%" }
  }
];

export const RevoGridExample = () => {
  // State management
  const [studies] = useState(EXAMPLE_STUDIES);
  const [variables] = useState(EXAMPLE_VARIABLES);
  const [mappings, setMappings] = useState(EXAMPLE_MAPPINGS);
  const [displayValueKey, setDisplayValueKey] = useState('raw');

  // Helper function: Find mapping for study + variable
  const findMapping = (studyId, variableId) => {
    return mappings.find(m => 
      m.studyId === studyId && m.studyVariableId === variableId
    );
  };

  // Helper function: Get specific value from mapping
  const getMappingValue = (studyId, variableId, valueKey) => {
    const mapping = findMapping(studyId, variableId);
    return mapping?.values[valueKey] || '';
  };

  // Helper function: Update or create mapping
  const updateMapping = (studyId, variableId, valueKey, newValue) => {
    const existingIndex = mappings.findIndex(m => 
      m.studyId === studyId && m.studyVariableId === variableId
    );

    let updatedMappings;

    if (existingIndex >= 0) {
      // Update existing mapping
      updatedMappings = [...mappings];
      updatedMappings[existingIndex] = {
        ...updatedMappings[existingIndex],
        values: {
          ...updatedMappings[existingIndex].values,
          [valueKey]: newValue
        }
      };
    } else {
      // Create new mapping
      const newMapping = {
        studyId,
        studyVariableId: variableId,
        values: {
          raw: valueKey === 'raw' ? newValue : '',
          normalized: valueKey === 'normalized' ? newValue : '',
          unit: valueKey === 'unit' ? newValue : ''
        }
      };
      
      updatedMappings = [...mappings, newMapping];
    }

    setMappings(updatedMappings);
  };

  // 1. Generate grid data: Studies as rows, Variables as columns
  const gridData = useMemo(() => {
    return studies.map(study => {
      const row = {
        id: study.id,
        studyName: study.name,
      };

      // For each variable, get the value from mappings
      variables.forEach(variable => {
        row[variable.id] = getMappingValue(study.id, variable.id, displayValueKey);
      });

      return row;
    });
  }, [studies, variables, mappings, displayValueKey]);

  // 2. Generate column definitions dynamically
  const columnDefs = useMemo(() => {
    const baseColumns = [
      {
        prop: 'studyName',
        name: 'Study Name',
        size: 200,
        readonly: true
      }
    ];

    const variableColumns = variables.map(variable => ({
      prop: variable.id,
      name: `${variable.name}${variable.unit ? ` (${variable.unit})` : ''} (${displayValueKey})`,
      size: 150,
      readonly: false
    }));

    return [...baseColumns, ...variableColumns];
  }, [variables, displayValueKey]);

  // 3. Handle cell editing - prevent RevoGrid's default behavior
  const handleCellEdit = (event) => {
    const { detail } = event;
    const { prop, rowIndex, val } = detail;
    
    // Skip if editing the study name column
    if (prop === 'studyName') return;

    const study = studies[rowIndex];
    const variableId = prop;
    
    // Update our external state instead of letting RevoGrid handle it
    updateMapping(study.id, variableId, displayValueKey, val);
  };

  // Get available value keys
  const availableValueKeys = [...new Set([
    'raw', 'normalized', 'unit',
    ...mappings.flatMap(m => Object.keys(m.values || {}))
  ])];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">RevoGrid with Normalized State Example</h2>
        
        {/* Value type selector */}
        <div className="flex gap-2 items-center">
          <label className="font-medium">Display Value Type:</label>
          <select 
            value={displayValueKey}
            onChange={(e) => setDisplayValueKey(e.target.value)}
            className="px-3 py-1 border rounded"
          >
            {availableValueKeys.map(key => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Expected grid output */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Expected Grid Structure:</h3>
          <div className="text-sm">
            <p>• Studies as rows: {studies.map(s => s.name).join(', ')}</p>
            <p>• Variables as columns: {variables.map(v => v.name).join(', ')}</p>
            <p>• Current display key: <strong>{displayValueKey}</strong></p>
          </div>
        </div>

        {/* RevoGrid */}
        <div className="border rounded-lg overflow-hidden">
          <RevoGrid
            source={gridData}
            columns={columnDefs}
            theme="compact"
            range={true}
            resize={true}
            canFocus={true}
            readonly={false}
            onAfterEdit={handleCellEdit}
            rowHeaders={true}
            autoSizeColumn={false}
            style={{ height: '400px' }}
          />
        </div>

        {/* Current state display */}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium">Current Mappings State</summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-60">
            {JSON.stringify(mappings, null, 2)}
          </pre>
        </details>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Normalized Data:</strong> Studies, Variables, and Mappings are kept separate</li>
            <li><strong>Dynamic Grid:</strong> Rows and columns are generated from the normalized data</li>
            <li><strong>Rich Values:</strong> Each mapping can have multiple value types (raw, normalized, unit)</li>
            <li><strong>Custom Editing:</strong> RevoGrid's default editing is overridden to update external state</li>
            <li><strong>Reactive Updates:</strong> Grid rebuilds automatically when state changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * KEY IMPLEMENTATION POINTS:
 * 
 * 1. DATA STRUCTURE:
 *    - studies: array of study objects
 *    - variables: array of variable objects  
 *    - mappings: array of {studyId, studyVariableId, values: {raw, normalized, unit, ...}}
 * 
 * 2. GRID GENERATION:
 *    - gridData: computed from studies (rows) + mappings (cell values)
 *    - columnDefs: computed from variables (columns)
 * 
 * 3. EDITING BEHAVIOR:
 *    - onAfterEdit: intercepts RevoGrid's edit events
 *    - Updates external mappings state instead of grid's internal source
 *    - Grid automatically rebuilds from updated state
 * 
 * 4. VALUE TYPES:
 *    - displayValueKey: controls which value type is shown/edited
 *    - Can switch between raw, normalized, unit, etc.
 *    - Each mapping can have different value types
 */
