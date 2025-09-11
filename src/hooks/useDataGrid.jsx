import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

/**
 * Generic data grid hook that can handle any combination of:
 * - Row data (studies, sensors, protocols, etc.)
 * - Column data (variables, protocols, etc.) 
 * - Cell mappings between rows and columns
 * 
 * @param {Object} config - Configuration object
 * @param {Array} config.rowData - Array of row objects (e.g., studies, sensors)
 * @param {Array} config.columnData - Array of column objects (e.g., variables, protocols) - optional
 * @param {Array} config.mappings - Array of mapping objects - optional
 * @param {Object} config.fieldMappings - Field name mappings for flexibility
 * @param {Array} config.staticColumns - Static columns to always show (e.g., name, description)
 * @param {number} config.maxHistorySize - Maximum undo/redo history size
 */
export const useDataGrid = ({
  rowData = [],
  columnData = [],
  mappings = [],
  fieldMappings = {},
  staticColumns = [],
  maxHistorySize = 50,
  onRowDataChange // Add this to support external row data updates
}) => {
  
  // Default field mappings with fallbacks
  const fields = {
    rowId: 'id',
    rowName: 'name', 
    columnId: 'id',
    columnName: 'name',
    columnUnit: 'unit',
    mappingRowId: 'studyId', // or sourceId, etc.
    mappingColumnId: 'studyVariableId', // or targetId, etc.
    mappingValue: 'value',
    ...fieldMappings
  };

  // Determine if this is a standalone grid (no dynamic columns/mappings)
  const isStandaloneGrid = columnData.length === 0;

  // State management for mappings
  const [currentMappings, setCurrentMappings] = useState(mappings);
  const [mappingHistory, setMappingHistory] = useState([mappings]);
  
  // State management for row data (for standalone grids)
  const [currentRowData, setCurrentRowData] = useState(rowData);
  const [rowDataHistory, setRowDataHistory] = useState([rowData]);
  
  // Unified history index
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs to track previous values to avoid infinite loops
  const prevRowDataRef = useRef(rowData);
  const prevMappingsRef = useRef(mappings);
  const prevColumnDataRef = useRef(columnData);

  // Mirror internal state in refs to allow effects to read latest values without
  // adding the state objects to dependency arrays (which caused update loops).
  const mappingHistoryRef = useRef(mappingHistory);
  const rowDataHistoryRef = useRef(rowDataHistory);
  const historyIndexRef = useRef(historyIndex);
  const currentRowDataRef = useRef(currentRowData);
  const currentMappingsRef = useRef(currentMappings);

  // Flag to prevent sync loops when updating via onRowDataChange
  const isUpdatingExternally = useRef(false);

  // Sync external rowData changes into history for both standalone and mapping grids.
  // This lets parent-driven adds/removes (for example adding a variable in the Variables→Studies view)
  // be recorded so undo/redo can restore them.
  useEffect(() => {
    // Skip if the change originated from this hook's own onRowDataChange callback
    if (isUpdatingExternally.current) {
      isUpdatingExternally.current = false;
      prevRowDataRef.current = rowData;
      return;
    }

    const prevLen = prevRowDataRef.current ? prevRowDataRef.current.length : 0;
    const newLen = rowData.length;

    // Only act on length changes (add/remove). Ignore content edits to avoid noisy history.
    if (prevLen !== newLen) {
      try {
        // When rows are removed, strip mappings that reference missing rows
        const allowedRowIds = new Set((rowData || []).map(r => r[fields.rowId]));
        const filteredMappings = currentMappings.filter(m => allowedRowIds.has(m[fields.mappingRowId]));
        if (filteredMappings.length !== currentMappings.length) {
          setCurrentMappings(filteredMappings);
        }


          // If the incoming rowData matches the last snapshot we already recorded,
          // this change likely originated from our own update (updateRowDataBatch). Skip adding a duplicate.
          const lastRowSnapshot = rowDataHistory[rowDataHistory.length - 1];
          if (lastRowSnapshot && JSON.stringify(lastRowSnapshot) === JSON.stringify(rowData)) {
            // nothing to add to history; just update refs/state where necessary
            if (isStandaloneGrid) setCurrentRowData(rowData);
            prevRowDataRef.current = rowData;
            return;
          }

          // Record paired snapshot (rows + mappings) into histories
          const newRowHistory = rowDataHistory.slice(0, historyIndex + 1);
          newRowHistory.push(JSON.parse(JSON.stringify(rowData)));

          const newMappingHistory = mappingHistory.slice(0, historyIndex + 1);
          newMappingHistory.push(JSON.parse(JSON.stringify(filteredMappings)));

        // Trim histories if needed
        if (newRowHistory.length > maxHistorySize) {
          const remove = newRowHistory.length - maxHistorySize;
          newRowHistory.splice(0, remove);
          newMappingHistory.splice(0, remove);
        }

        const newIndex = newRowHistory.length - 1;
        setHistoryIndex(newIndex);
        setRowDataHistory(newRowHistory);
        setMappingHistory(newMappingHistory);

        // If this is a standalone grid, also update the internal currentRowData so the grid reflects the change
        if (isStandaloneGrid) {
          setCurrentRowData(rowData);
        }
      } catch (err) {
        console.error('[useDataGrid] error handling external rowData structural change', err);
      }
    }

    prevRowDataRef.current = rowData;
  // Only watch external inputs here to avoid re-running when internal histories change
  }, [rowData, maxHistorySize, isStandaloneGrid, fields]);

  // Sync mappings with prop changes for mapping grids (only on mount and significant changes)
  useEffect(() => {
    if (isStandaloneGrid) return;

    try {
      const incoming = mappings || [];
      const current = currentMappingsRef.current || [];

      // If incoming mappings are deeply equal to current internal mappings, it's likely
      // the change originated from this hook and was echoed back by the parent — ignore.
      if (JSON.stringify(incoming) === JSON.stringify(current)) {
        prevMappingsRef.current = incoming;
        return;
      }

      // Adopt external mappings into internal state
      prevMappingsRef.current = incoming;
      setCurrentMappings(incoming);

      // Record the external change into history (paired snapshot)
      setMappingHistory(prev => {
        const copy = prev.slice(0);
        copy.push(JSON.parse(JSON.stringify(incoming)));
        // Trim if needed
        if (copy.length > maxHistorySize) copy.splice(0, copy.length - maxHistorySize);
        mappingHistoryRef.current = copy;
        return copy;
      });

      setRowDataHistory(prev => {
        const copy = prev.slice(0);
        copy.push(JSON.parse(JSON.stringify(currentRowDataRef.current || rowData)));
        if (copy.length > maxHistorySize) copy.splice(0, copy.length - maxHistorySize);
        rowDataHistoryRef.current = copy;
        return copy;
      });

      // Update history index to newest
      setHistoryIndex(() => {
        const idx = mappingHistoryRef.current.length - 1;
        historyIndexRef.current = idx;
        return idx;
      });
    } catch (err) {
      console.error('[useDataGrid] error syncing external mappings prop', err);
    }
  // Only depend on external mapping prop and a few stable inputs
  }, [mappings, isStandaloneGrid, maxHistorySize, rowData, fields]);

  // Track structural changes to columns (e.g. variables added/removed) and record them in history
  useEffect(() => {
    if (isStandaloneGrid) return; // only relevant for mapping grids

    const prevLen = prevColumnDataRef.current ? prevColumnDataRef.current.length : 0;
    const newLen = columnData.length;

    // Only act on length changes (add/remove). Ignore content updates to avoid noisy history.
    if (prevLen !== newLen) {
      // When columns are removed, strip mappings that reference missing columns
      try {
        const allowedColumnIds = new Set((columnData || []).map(c => c[fields.columnId]));
        const filteredMappings = (currentMappingsRef.current || []).filter(m => allowedColumnIds.has(m[fields.mappingColumnId]));
        if (filteredMappings.length !== (currentMappingsRef.current || []).length) {
          setCurrentMappings(filteredMappings);
          currentMappingsRef.current = filteredMappings;
        }

        // Record a paired snapshot (mappings + rowData)
        setMappingHistory(prev => {
          const copy = prev.slice(0);
          copy.push(JSON.parse(JSON.stringify(filteredMappings)));
          if (copy.length > maxHistorySize) copy.splice(0, copy.length - maxHistorySize);
          mappingHistoryRef.current = copy;
          return copy;
        });

        setRowDataHistory(prev => {
          const copy = prev.slice(0);
          copy.push(JSON.parse(JSON.stringify(currentRowDataRef.current || rowData)));
          if (copy.length > maxHistorySize) copy.splice(0, copy.length - maxHistorySize);
          rowDataHistoryRef.current = copy;
          return copy;
        });

        setHistoryIndex(() => {
          const idx = mappingHistoryRef.current.length - 1;
          historyIndexRef.current = idx;
          return idx;
        });
      } catch (err) {
        console.error('[useDataGrid] error handling columnData structural change', err);
      }
    }

    prevColumnDataRef.current = columnData;
  // Only depend on external columnData and a few stable inputs to avoid loops
  }, [columnData, isStandaloneGrid, maxHistorySize, rowData, fields]);

  // Keep refs in sync with internal state so effects can read latest values without adding
  // the full state objects to dependency arrays.
  useEffect(() => { mappingHistoryRef.current = mappingHistory; }, [mappingHistory]);
  useEffect(() => { rowDataHistoryRef.current = rowDataHistory; }, [rowDataHistory]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  useEffect(() => { currentRowDataRef.current = currentRowData; }, [currentRowData]);
  useEffect(() => { currentMappingsRef.current = currentMappings; }, [currentMappings]);

  // Undo/Redo functionality
  const canUndo = historyIndex > 0;
  // Histories should be kept in sync; use mappingHistory length as source of truth
  const canRedo = historyIndex < mappingHistory.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      console.log('[useDataGrid] undo', { historyIndex });
      const newIndex = Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      const newRowData = rowDataHistory[newIndex] || [];
      setCurrentRowData(newRowData);
      if (onRowDataChange) {
        isUpdatingExternally.current = true;
        onRowDataChange(newRowData);
      }
      const newMappings = mappingHistory[newIndex] || [];
      setCurrentMappings(newMappings);
    }
  }, [canUndo, historyIndex, rowDataHistory, mappingHistory, onRowDataChange]);

  const redo = useCallback(() => {
    if (canRedo) {
      console.log('[useDataGrid] redo', { historyIndex });
      const newIndex = Math.min(Math.max(rowDataHistory.length, mappingHistory.length) - 1, historyIndex + 1);
      setHistoryIndex(newIndex);
      const newRowData = rowDataHistory[newIndex] || [];
      setCurrentRowData(newRowData);
      if (onRowDataChange) {
        isUpdatingExternally.current = true;
        onRowDataChange(newRowData);
      }
      const newMappings = mappingHistory[newIndex] || [];
      setCurrentMappings(newMappings);
    }
  }, [canRedo, historyIndex, rowDataHistory, mappingHistory, onRowDataChange]);

  const addToHistory = useCallback((newMappings) => {
    // Push mapping snapshot and current rowData snapshot together to keep histories aligned
    console.log('[useDataGrid] addToHistory', { newMappings, historyIndex });
    const newMappingHistory = mappingHistory.slice(0, historyIndex + 1);
    newMappingHistory.push(JSON.parse(JSON.stringify(newMappings)));

    const newRowHistory = rowDataHistory.slice(0, historyIndex + 1);
    // Use currentRowData if available, else fallback to provided rowData
    newRowHistory.push(JSON.parse(JSON.stringify(currentRowData || rowData)));

    // Trim histories if needed
    if (newMappingHistory.length > maxHistorySize) {
      const remove = newMappingHistory.length - maxHistorySize;
      newMappingHistory.splice(0, remove);
      newRowHistory.splice(0, remove);
    }

    const newIndex = newMappingHistory.length - 1;
    setHistoryIndex(newIndex);
    setMappingHistory(newMappingHistory);
    setRowDataHistory(newRowHistory);
    setCurrentMappings(newMappings);
    setCurrentRowData(newRowHistory[newRowHistory.length - 1]);
  }, [mappingHistory, rowDataHistory, historyIndex, maxHistorySize, currentRowData, rowData]);

  // Add to row data history for all grids
  const addToRowDataHistory = useCallback((newRowData) => {
    // Push rowData snapshot and current mappings snapshot together to keep histories aligned
    console.log('[useDataGrid] addToRowDataHistory', { newRowData, historyIndex });
    const last = rowDataHistory[historyIndex];
    const isDifferent = JSON.stringify(last) !== JSON.stringify(newRowData);
    if (!isDifferent) return;

    const newRowHistory = rowDataHistory.slice(0, historyIndex + 1);
    newRowHistory.push(JSON.parse(JSON.stringify(newRowData)));

    const newMappingHistory = mappingHistory.slice(0, historyIndex + 1);
    newMappingHistory.push(JSON.parse(JSON.stringify(currentMappings || mappings)));

    // Trim histories if needed
    if (newRowHistory.length > maxHistorySize) {
      const remove = newRowHistory.length - maxHistorySize;
      newRowHistory.splice(0, remove);
      newMappingHistory.splice(0, remove);
    }

    const newIndex = newRowHistory.length - 1;
    setHistoryIndex(newIndex);
    setRowDataHistory(newRowHistory);
    setMappingHistory(newMappingHistory);
    setCurrentRowData(newRowHistory[newRowHistory.length - 1]);
    setCurrentMappings(newMappingHistory[newMappingHistory.length - 1]);

    // Notify parent once
    if (onRowDataChange && !isUpdatingExternally.current) {
      isUpdatingExternally.current = true;
      onRowDataChange(newRowData);
      isUpdatingExternally.current = false;
    }
  }, [rowDataHistory, mappingHistory, historyIndex, maxHistorySize, onRowDataChange, currentMappings, mappings]);

  // Create optimized mapping lookup for O(1) access
  const mappingLookup = useMemo(() => {
    const lookup = new Map();
    currentMappings.forEach(mapping => {
      const key = `${mapping[fields.mappingRowId]}-${mapping[fields.mappingColumnId]}`;
      lookup.set(key, mapping);
    });
    return lookup;
  }, [currentMappings, fields]);

  // Use current row data for standalone grids, otherwise use prop rowData
  const activeRowData = isStandaloneGrid ? currentRowData : rowData;

  // Generate column definitions for RevoGrid
  const columnDefs = useMemo(() => {
    const columns = [...staticColumns];

    // Add dynamic columns based on columnData
    if (columnData.length > 0) {
      columnData.forEach(column => {
        // Check if this should have child columns (for sensor-protocol mapping)
        const hasChildColumns = fields.hasChildColumns;
        
        if (hasChildColumns) {
          // Create parent column with children for specification and unit
          const parentColumn = {
            prop: column[fields.columnId],
            name: column[fields.columnName],
            size: 200, // Total width for the group
            children: [
              {
                prop: `${column[fields.columnId]}_spec`,
                name: "Specification",
                size: 120,
                readonly: false,
                editor: 'input'
              },
              {
                prop: `${column[fields.columnId]}_unit`,
                name: "Unit",
                size: 80,
                readonly: false,
                editor: 'input',
                cellProperties: () => ({
                  style: { "border-right": "3px solid black" }
                })
              }
            ]
          };
          
          columns.push(parentColumn);
        } else {
          // Regular single column
          const dynamicColumn = {
            prop: column[fields.columnId],
            name: `${column[fields.columnName]}${column[fields.columnUnit] ? ` (${column[fields.columnUnit]})` : ''}`,
            size: 150,
            readonly: false
          };
          columns.push(dynamicColumn);
        }
      });
    }

    return columns;
  }, [columnData, staticColumns, fields]);

  // Transform data for RevoGrid
  const gridData = useMemo(() => {
    return activeRowData.map(row => {
      const gridRow = { ...row };

      // Add mapping values as columns (only for non-standalone grids)
      if (columnData.length > 0) {
        columnData.forEach(column => {
          const mappingKey = `${row[fields.rowId]}-${column[fields.columnId]}`;
          const mapping = mappingLookup.get(mappingKey);
          
          if (fields.hasChildColumns) {
            // Handle child columns for specification and unit
            let specValue = '';
            let unitValue = '';
            
            if (mapping && mapping[fields.mappingValue]) {
              const value = mapping[fields.mappingValue];
              if (Array.isArray(value)) {
                // Handle array format: ["24", "bit"]
                specValue = value[0] || '';
                unitValue = value[1] || '';
              } else if (typeof value === 'string') {
                // Handle string format: "24;bit"
                const parts = value.split(';');
                specValue = parts[0] || '';
                unitValue = parts[1] || '';
              } else if (typeof value === 'object' && value !== null) {
                // Handle object format: {specification: "24", unit: "bit"}
                specValue = value.specification || '';
                unitValue = value.unit || '';
              }
            }
            
            gridRow[`${column[fields.columnId]}_spec`] = specValue;
            gridRow[`${column[fields.columnId]}_unit`] = unitValue;
          } else {
            // Regular single column
            gridRow[column[fields.columnId]] = mapping ? mapping[fields.mappingValue] : '';
          }
        });
      }

      return gridRow;
    });
  }, [activeRowData, columnData, mappingLookup, fields]);

  // Update a single cell mapping
  const updateMapping = useCallback((rowId, columnId, value) => {
    // Handle child columns
    const isChildColumn = columnId.includes('_spec') || columnId.includes('_unit');
    let actualColumnId = columnId;
    let childType = null;
    
    if (isChildColumn) {
      if (columnId.endsWith('_spec')) {
        actualColumnId = columnId.replace('_spec', '');
        childType = 'specification';
      } else if (columnId.endsWith('_unit')) {
        actualColumnId = columnId.replace('_unit', '');
        childType = 'unit';
      }
    }
    
    const mappingKey = `${rowId}-${actualColumnId}`;
    const existingMapping = mappingLookup.get(mappingKey);
    
    let newMappings;
    if (existingMapping) {
      // Update existing mapping
      newMappings = currentMappings.map(mapping => {
        if (mapping[fields.mappingRowId] === rowId && mapping[fields.mappingColumnId] === actualColumnId) {
          if (isChildColumn && fields.hasChildColumns) {
            // Handle child column updates
            let currentValue = mapping[fields.mappingValue];
            let specValue = '';
            let unitValue = '';
            
            // Parse current value
            if (Array.isArray(currentValue)) {
              specValue = currentValue[0] || '';
              unitValue = currentValue[1] || '';
            } else if (typeof currentValue === 'string') {
              const parts = currentValue.split(';');
              specValue = parts[0] || '';
              unitValue = parts[1] || '';
            } else if (typeof currentValue === 'object' && currentValue !== null) {
              specValue = currentValue.specification || '';
              unitValue = currentValue.unit || '';
            }
            
            // Update the appropriate part
            if (childType === 'specification') {
              specValue = value;
            } else if (childType === 'unit') {
              unitValue = value;
            }
            
            // Store as array format for simplicity
            return {
              ...mapping,
              [fields.mappingValue]: [specValue, unitValue]
            };
          } else {
            // Regular mapping update
            return {
              ...mapping,
              [fields.mappingValue]: value
            };
          }
        }
        return mapping;
      });
    } else {
      // Create new mapping
      let mappingValue = value;
      if (isChildColumn && fields.hasChildColumns) {
        // Create new mapping with appropriate structure
        if (childType === 'specification') {
          mappingValue = [value, ''];
        } else if (childType === 'unit') {
          mappingValue = ['', value];
        }
      }
      
      const newMapping = {
        [fields.mappingRowId]: rowId,
        [fields.mappingColumnId]: actualColumnId,
        [fields.mappingValue]: mappingValue
      };
      newMappings = [...currentMappings, newMapping];
    }
    
    addToHistory(newMappings);
  }, [currentMappings, mappingLookup, fields, addToHistory]);

  // Update multiple mappings in batch
  const updateMappingsBatch = useCallback((updates) => {
    let newMappings = [...currentMappings];
    
    updates.forEach(({ rowId, columnId, value }) => {
      // Handle child columns
      const isChildColumn = columnId.includes('_spec') || columnId.includes('_unit');
      let actualColumnId = columnId;
      let childType = null;
      
      if (isChildColumn) {
        if (columnId.endsWith('_spec')) {
          actualColumnId = columnId.replace('_spec', '');
          childType = 'specification';
        } else if (columnId.endsWith('_unit')) {
          actualColumnId = columnId.replace('_unit', '');
          childType = 'unit';
        }
      }

      const existingIndex = newMappings.findIndex(
        m => m[fields.mappingRowId] === rowId && m[fields.mappingColumnId] === actualColumnId
      );

      if (existingIndex >= 0) {
        if (isChildColumn && fields.hasChildColumns) {
          // Handle child column batch updates
          let currentValue = newMappings[existingIndex][fields.mappingValue];
          let specValue = '';
          let unitValue = '';
          
          // Parse current value
          if (Array.isArray(currentValue)) {
            specValue = currentValue[0] || '';
            unitValue = currentValue[1] || '';
          } else if (typeof currentValue === 'string') {
            const parts = currentValue.split(';');
            specValue = parts[0] || '';
            unitValue = parts[1] || '';
          } else if (typeof currentValue === 'object' && currentValue !== null) {
            specValue = currentValue.specification || '';
            unitValue = currentValue.unit || '';
          }
          
          // Update the appropriate part
          if (childType === 'specification') {
            specValue = value;
          } else if (childType === 'unit') {
            unitValue = value;
          }
          
          newMappings[existingIndex] = {
            ...newMappings[existingIndex],
            [fields.mappingValue]: [specValue, unitValue]
          };
        } else {
          // Regular batch update
          newMappings[existingIndex] = {
            ...newMappings[existingIndex],
            [fields.mappingValue]: value
          };
        }
      } else {
        // Create new mapping
        let mappingValue = value;
        if (isChildColumn && fields.hasChildColumns) {
          if (childType === 'specification') {
            mappingValue = [value, ''];
          } else if (childType === 'unit') {
            mappingValue = ['', value];
          }
        }
        
        newMappings.push({
          [fields.mappingRowId]: rowId,
          [fields.mappingColumnId]: actualColumnId,
          [fields.mappingValue]: mappingValue
        });
      }
    });
    
    addToHistory(newMappings);
  }, [currentMappings, fields, addToHistory]);

  // Update row data for all grids
  const updateRowData = useCallback((rowId, columnProp, value) => {
    const newRowData = activeRowData.map(row => 
      row[fields.rowId] === rowId 
        ? { ...row, [columnProp]: value }
        : row
    );
    addToRowDataHistory(newRowData);
    // Notify parent component
    if (onRowDataChange) {
      isUpdatingExternally.current = true;
      onRowDataChange(newRowData);
    }
  }, [activeRowData, fields, addToRowDataHistory, onRowDataChange]);

  // Batch update row data for all grids (used for range edits)
  const updateRowDataBatch = useCallback((newRowData) => {
    // Keep mappings in sync with the new row set: remove mappings for rows that no longer exist.
    try {
      const allowedRowIds = new Set((newRowData || []).map(r => r[fields.rowId]));
      const filteredMappings = currentMappings.filter(m => allowedRowIds.has(m[fields.mappingRowId]));
      if (filteredMappings.length !== currentMappings.length) {
        setCurrentMappings(filteredMappings);
      }
    } catch (err) {
      console.error('[useDataGrid] error filtering mappings on rowData batch update', err);
    }

    // Push the paired snapshot (rows + mappings) into history
    addToRowDataHistory(newRowData);

    // Prevent recursion: only call onRowDataChange if not already updating externally
    if (onRowDataChange && !isUpdatingExternally.current) {
      isUpdatingExternally.current = true;
      onRowDataChange(newRowData);
      isUpdatingExternally.current = false;
    }
  }, [addToRowDataHistory, onRowDataChange]);

  // Clear a specific cell
  const clearCell = useCallback((rowId, columnId) => {
    updateMapping(rowId, columnId, '');
  }, [updateMapping]);

  // Clear all mappings
  const clearAllMappings = useCallback(() => {
    const clearedMappings = currentMappings.map(mapping => ({
      ...mapping,
      [fields.mappingValue]: ''
    }));
    addToHistory(clearedMappings);
  }, [currentMappings, fields, addToHistory]);

  // Get mapping value for a specific cell
  const getMappingValue = useCallback((rowId, columnId) => {
    const mappingKey = `${rowId}-${columnId}`;
    const mapping = mappingLookup.get(mappingKey);
    return mapping ? mapping[fields.mappingValue] : '';
  }, [mappingLookup, fields]);

  // Check if a column is editable (has columnData)
  const isEditableColumn = useCallback((columnProp) => {
    // Handle child columns
    if (columnProp.includes('_spec') || columnProp.includes('_unit')) {
      const parentColumnId = columnProp.replace(/_spec$|_unit$/, '');
      return columnData.some(col => col[fields.columnId] === parentColumnId);
    }
    
    // Regular column check
    return columnData.some(col => col[fields.columnId] === columnProp);
  }, [columnData, fields]);

  // Get row by index
  const getRowByIndex = useCallback((index) => {
    return activeRowData[index];
  }, [activeRowData]);

  // Get column by prop
  const getColumnByProp = useCallback((prop) => {
    return columnData.find(col => col[fields.columnId] === prop);
  }, [columnData, fields]);

  // Calculate coverage statistics
  const stats = useMemo(() => {
    if (isStandaloneGrid) {
      // For standalone grids, show row count and column count
      return {
        totalRows: activeRowData.length,
        totalColumns: staticColumns.length,
        totalMappings: 0, // No mappings in standalone mode
        filledMappings: 0,
        coverage: 0 // No coverage concept for standalone grids
      };
    }
    
    const totalPossibleMappings = activeRowData.length * columnData.length;
    const filledMappings = currentMappings.filter(
      m => m[fields.mappingValue] && m[fields.mappingValue].toString().trim() !== ''
    ).length;
    
    return {
      totalRows: activeRowData.length,
      totalColumns: columnData.length,
      totalMappings: currentMappings.length,
      filledMappings,
      coverage: totalPossibleMappings > 0 ? Math.round((filledMappings / totalPossibleMappings) * 100) : 0
    };
  }, [isStandaloneGrid, activeRowData, columnData, currentMappings, staticColumns, fields]);

  return {
    // Data
    rowData: activeRowData,
    columnData,
    mappings: currentMappings,
    gridData,
    columnDefs,
    
    // State
    canUndo,
    canRedo,
    historyIndex,
    mappingHistory,
    isStandaloneGrid,
    
    // Actions
    undo,
    redo,
    updateMapping,
    updateMappingsBatch,
    updateRowData, // New function for standalone grids
    updateRowDataBatch, // New function for batch row data updates
    clearCell,
    clearAllMappings,
    
    // Utilities
    getMappingValue,
    isEditableColumn,
    getRowByIndex,
    getColumnByProp,
    
    // Stats
    stats,
    
    // Internals (if needed for advanced usage)
    fields,
    mappingLookup
  };
};
