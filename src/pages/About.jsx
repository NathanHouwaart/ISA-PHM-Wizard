import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import PageWrapper from "../layout/PageWrapper";
import "./About.css";
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import { useRichMappings } from '../hooks/useRichMappings';

export const About = () => {
  const { 
    studyVariables, 
    studies, 
    studyToStudyVariableMapping, 
    setStudyToStudyVariableMapping 
  } = useGlobalDataContext();

  // Use the rich mappings hook for better data management
  const {
    getMappingValue,
    updateMapping,
    getAvailableValueKeys
  } = useRichMappings(studyToStudyVariableMapping, setStudyToStudyVariableMapping);

  // State to control which value key to display (raw, normalized, etc.)
  const [displayValueKey, setDisplayValueKey] = useState('raw');
  
  // Ref for the grid to force updates
  const gridRef = useRef(null);
  
  // Force grid update when mappings change
  const [gridKey, setGridKey] = useState(0);

  // Get available value keys dynamically
  const availableValueKeys = getAvailableValueKeys();

  // Generate grid data based on normalized state
  const gridData = useMemo(() => {
    const data = studies.map(study => {
      const row = {
        id: study.id,
        studyName: study.name,
      };

      // For each variable, find the mapping and extract the specific value key
      studyVariables.forEach(variable => {
        row[variable.id] = getMappingValue(study.id, variable.id, displayValueKey);
      });

      return row;
    });
    
    console.log('Generated grid data:', data);
    return data;
  }, [studies, studyVariables, getMappingValue, displayValueKey, studyToStudyVariableMapping]);

  // Force grid re-render when data changes
  useEffect(() => {
    setGridKey(prev => prev + 1);
  }, [gridData]);

  // Generate column definitions dynamically
  const columnDefs = useMemo(() => {
    const baseColumns = [
      {
        prop: 'studyName',
        name: 'Study Name',
        size: 200,
        readonly: true,
        // cellProperties: {
        //   readonly: true
        // }
      }
    ];

    const variableColumns = studyVariables.map(variable => ({
      prop: variable.id,
      name: `${variable.name}${variable.unit ? ` (${variable.unit})` : ''} (${displayValueKey})`,
      size: 150,
      readonly: false,
      // cellProperties: {
      //   readonly: false
      // }
    }));

    return [...baseColumns, ...variableColumns];
  }, [studyVariables, displayValueKey]);

  // Handle cell editing with the correct RevoGrid event structure
  const handleCellEdit = (event) => {
    console.log('Cell edit event:', event);
    
    // RevoGrid events come as custom events, not React synthetic events
    // The data is usually in event.detail for custom events
    let editData;
    
    if (event.detail) {
      editData = event.detail;
    } else if (event.data) {
      editData = event.data;
    } else if (event.target && event.target.value !== undefined) {
      // This might be a direct input event - we need to extract the cell info differently
      console.log('Input event detected, trying to extract cell info');
      return; // Skip for now as this won't have row/column info
    } else {
      console.log('Unknown event structure:', event);
      return;
    }
    
    console.log('Edit data:', editData);
    
    const { prop, rowIndex, val, oldVal } = editData;
    
    console.log('Edit details:', { prop, rowIndex, val, oldVal });
    
    // Skip if editing the study name column
    if (prop === 'studyName') {
      console.log('Skipping study name edit');
      return;
    }

    const study = studies[rowIndex];
    if (!study) {
      console.log('No study found at index:', rowIndex);
      return;
    }
    
    const variableId = prop;
    
    console.log('Updating mapping:', { 
      studyId: study.id, 
      variableId, 
      displayValueKey, 
      val 
    });
    
    // Use the hook to update the mapping
    updateMapping(study.id, variableId, displayValueKey, val);
  };

  // Handle before edit to ensure we can edit
  const handleBeforeEdit = (event) => {
    console.log('Before edit event:', event);
    return true; // Allow editing
  };

  // Try different event handlers for RevoGrid
  const handleAfterEdit = (event) => {
    console.log('After edit event:', event);
    handleCellEdit(event);
  };

  const handleCellUpdate = (event) => {
    console.log('Cell update event:', event);
    handleCellEdit(event);
  };

  // This might be the correct event for RevoGrid
  const handleSourceChange = (event) => {
    console.log('Source change event:', event);
    handleCellEdit(event);
  };

  // Try using the grid ref to listen to events directly
  useEffect(() => {
    const gridElement = gridRef.current;
    if (gridElement) {
      const handleEdit = (e) => {
        console.log('Native edit event:', e);
        handleCellEdit(e);
      };

      // Listen to various possible events
      gridElement.addEventListener('afteredit', handleEdit);
      gridElement.addEventListener('celledit', handleEdit);
      gridElement.addEventListener('edit', handleEdit);
      gridElement.addEventListener('change', handleEdit);

      return () => {
        gridElement.removeEventListener('afteredit', handleEdit);
        gridElement.removeEventListener('celledit', handleEdit);
        gridElement.removeEventListener('edit', handleEdit);
        gridElement.removeEventListener('change', handleEdit);
      };
    }
  }, [gridRef.current]);

  // Alternative approach: Use a more controlled grid update method
  const handleDirectCellEdit = useCallback((rowIndex, columnProp, newValue) => {
    console.log('Direct cell edit:', { rowIndex, columnProp, newValue });
    
    if (columnProp === 'studyName') return;
    
    const study = studies[rowIndex];
    if (!study) return;
    
    updateMapping(study.id, columnProp, displayValueKey, newValue);
    
    // Force immediate grid update
    setGridKey(prev => prev + 1);
  }, [studies, displayValueKey, updateMapping]);

  // Alternative event handler that might work better
  const handleGridEdit = useCallback((e) => {
    console.log('Grid edit event (alternative):', e);
    
    // Try different ways to extract the edit information
    if (e.detail && e.detail.changes) {
      e.detail.changes.forEach(change => {
        const { rowIndex, prop, val } = change;
        handleDirectCellEdit(rowIndex, prop, val);
      });
    } else if (e.detail) {
      const { rowIndex, prop, val } = e.detail;
      handleDirectCellEdit(rowIndex, prop, val);
    }
  }, [handleDirectCellEdit]);

  // Try to intercept edit events using different methods
  const interceptEdit = useCallback((event) => {
    console.log('Intercepted edit:', event);
    // Prevent default and handle ourselves
    event.preventDefault?.();
    event.stopPropagation?.();
    
    handleGridEdit(event);
  }, [handleGridEdit]);

  // Available value keys for display
  const valueKeys = availableValueKeys;

  return (
    <PageWrapper>
      <div className='space-y-6'>
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Study Variables Mapping Grid</h2>
          
          {/* Value key selector */}
          <div className="flex gap-2 items-center">
            <label className="font-medium">Display Value Type:</label>
            <select 
              value={displayValueKey}
              onChange={(e) => setDisplayValueKey(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              {valueKeys.map(key => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Debug and test section */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Debug & Test:</h3>
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => {
                  console.log('Testing manual update');
                  const firstStudy = studies[0];
                  const firstVariable = studyVariables[0];
                  if (firstStudy && firstVariable) {
                    updateMapping(firstStudy.id, firstVariable.id, displayValueKey, 'TEST_VALUE_' + Date.now());
                  }
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Test Manual Update
              </button>
              <button 
                onClick={() => {
                  // Force grid refresh
                  setGridKey(prev => prev + 1);
                }}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
              >
                Force Grid Refresh
              </button>
              <button 
                onClick={() => {
                  console.log('Current state:');
                  console.log('Studies:', studies);
                  console.log('Variables:', studyVariables);
                  console.log('Mappings:', studyToStudyVariableMapping);
                  console.log('Grid data:', gridData);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Log Current State
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Open browser console (F12) to see debug information
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Each row represents a study</li>
              <li>Each column represents a study variable</li>
              <li>Double-click any cell to edit the {displayValueKey} value</li>
              <li>Switch between Raw, Normalized, and Unit values using the dropdown above</li>
              <li>Changes are automatically saved to your normalized data structure</li>
            </ul>
          </div>

          {/* RevoGrid */}
          <div className="border rounded-lg overflow-hidden">
            <RevoGrid
              ref={gridRef}
              key={gridKey}
              source={gridData}
              columns={columnDefs}
              theme="compact"
              range={true}
              resize={true}
              canFocus={true}
              readonly={false}
              stretch={true}
              onBeforeEdit={handleBeforeEdit}
              onAfterEdit={handleAfterEdit}
              onEdit={interceptEdit}
              onCellUpdate={handleCellUpdate}
              onSourceChange={handleSourceChange}
              onBeforeSourceSet={handleBeforeEdit}
              onAfterSourceSet={handleAfterEdit}
              rowHeaders={true}
              autoSizeColumn={false}
              style={{ height: '500px' }}
            />
          </div>

          {/* Debug info */}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Debug: Current Mapping State</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(studyToStudyVariableMapping, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </PageWrapper>
  );
}