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

  // Flag to prevent sync loops when updating via onRowDataChange
  const isUpdatingExternally = useRef(false);

  // Sync internal row data with prop changes for standalone grids
  useEffect(() => {
    if (isStandaloneGrid && !isUpdatingExternally.current) {
      // Check if rowData actually changed (different length or content)
      const currentLength = currentRowData.length;
      const newLength = rowData.length;
      const lengthChanged = currentLength !== newLength;
      
      // Only sync if the length changed (indicating external add/remove)
      // Don't sync for content changes as those should go through undo/redo
      if (lengthChanged) {
        prevRowDataRef.current = rowData;
        setCurrentRowData(rowData);
        // Add to history so user can undo external changes
        const newHistory = rowDataHistory.slice(0, historyIndex + 1);
        newHistory.push([...rowData]);
        setRowDataHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
    isUpdatingExternally.current = false;
  }, [rowData, isStandaloneGrid, currentRowData.length, rowDataHistory, historyIndex]);

  // Sync mappings with prop changes for mapping grids (only on mount and significant changes)
  useEffect(() => {
    if (!isStandaloneGrid) {
      // Only update if this is the initial mount or if mappings length changed significantly
      const isInitialMount = prevMappingsRef.current === mappings;
      const lengthChanged = Math.abs(prevMappingsRef.current.length - mappings.length) > 10; // Only reset on significant changes
      
      if (isInitialMount || lengthChanged) {
        prevMappingsRef.current = mappings;
        setCurrentMappings(mappings);
        // Only reset history if length changed significantly, not on every edit
        if (lengthChanged) {
          setMappingHistory([mappings]);
          setHistoryIndex(0);
        }
      }
    }
  }, [mappings, isStandaloneGrid]);

  // Undo/Redo functionality
  const canUndo = historyIndex > 0;
  const canRedo = isStandaloneGrid 
    ? historyIndex < rowDataHistory.length - 1
    : historyIndex < mappingHistory.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      if (isStandaloneGrid) {
        const newRowData = rowDataHistory[newIndex];
        setCurrentRowData(newRowData);
        // Notify parent component of row data change
        if (onRowDataChange) {
          isUpdatingExternally.current = true;
          onRowDataChange(newRowData);
        }
      } else {
        const newMappings = mappingHistory[newIndex];
        setCurrentMappings(newMappings);
        // Note: parent will be notified via useEffect in DataGrid component
      }
    }
  }, [canUndo, historyIndex, isStandaloneGrid, rowDataHistory, mappingHistory, onRowDataChange]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      if (isStandaloneGrid) {
        const newRowData = rowDataHistory[newIndex];
        setCurrentRowData(newRowData);
        // Notify parent component of row data change
        if (onRowDataChange) {
          isUpdatingExternally.current = true;
          onRowDataChange(newRowData);
        }
      } else {
        const newMappings = mappingHistory[newIndex];
        setCurrentMappings(newMappings);
        // Note: parent will be notified via useEffect in DataGrid component
      }
    }
  }, [canRedo, historyIndex, isStandaloneGrid, rowDataHistory, mappingHistory, onRowDataChange]);

  const addToHistory = useCallback((newMappings) => {
    const newHistory = mappingHistory.slice(0, historyIndex + 1);
    newHistory.push(newMappings);
    
    if (newHistory.length > maxHistorySize) {
      newHistory.splice(0, newHistory.length - maxHistorySize);
      setHistoryIndex(maxHistorySize - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setMappingHistory(newHistory);
    setCurrentMappings(newMappings);
  }, [mappingHistory, historyIndex, maxHistorySize]);

  // Add to row data history for standalone grids
  const addToRowDataHistory = useCallback((newRowData) => {
    const newHistory = rowDataHistory.slice(0, historyIndex + 1);
    newHistory.push([...newRowData]); // Deep copy to prevent mutations
    
    if (newHistory.length > maxHistorySize) {
      newHistory.splice(0, newHistory.length - maxHistorySize);
      setHistoryIndex(maxHistorySize - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setRowDataHistory(newHistory);
    setCurrentRowData([...newRowData]);
  }, [rowDataHistory, historyIndex, maxHistorySize]);

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

  // Update row data for standalone grids
  const updateRowData = useCallback((rowId, columnProp, value) => {
    if (!isStandaloneGrid) return;
    
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
  }, [isStandaloneGrid, activeRowData, fields, addToRowDataHistory, onRowDataChange]);

  // Batch update row data for standalone grids (used for range edits)
  const updateRowDataBatch = useCallback((newRowData) => {
    if (!isStandaloneGrid) return;
    
    addToRowDataHistory(newRowData);
    
    // Notify parent component
    if (onRowDataChange) {
      isUpdatingExternally.current = true;
      onRowDataChange(newRowData);
    }
  }, [isStandaloneGrid, addToRowDataHistory, onRowDataChange]);

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
