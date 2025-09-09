import React, { useCallback, useEffect, useState, useRef } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { useDataGrid } from '../hooks/useDataGrid';
import "./GridTable/GridTable.css";

/**
 * Generic DataGrid component that can handle any type of data
 * with optional mapping functionality
 */
const DataGrid = ({
  // Data configuration
  rowData = [],
  columnData = [],
  mappings = [],
  
  // Field mapping configuration for flexibility
  fieldMappings = {},
  
  // Static columns (always shown, readonly)
  staticColumns = [],
  
  // Grid configuration
  height = '600px',
//   theme = 'compact',
  title = 'Data Grid',
  showControls = true,
  showDebug = false,
  rowsize = 50,
  
  // Event handlers
  onDataChange,
  onRowDataChange,
  
  // Other props
  className = '',
  ...gridProps
}) => {
  
  const {
    gridData,
    columnDefs,
    canUndo,
    canRedo,
    undo,
    redo,
    updateMapping,
    updateMappingsBatch,
    updateRowData, // New function for standalone grids
    updateRowDataBatch, // New function for batch row data updates
    clearAllMappings,
    isEditableColumn,
    getRowByIndex,
    getColumnByProp,
    stats,
    mappings: currentMappings,
    isStandaloneGrid,
    fields
  } = useDataGrid({
    rowData,
    columnData,
    mappings,
    fieldMappings,
    staticColumns,
    onRowDataChange // Pass the callback to the hook
  });

  // State to track column sizes to prevent resetting on re-render
  const [columnSizes, setColumnSizes] = useState(new Map());
  const gridRef = useRef();

  // Effect to add event listeners for column resize
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const handleResize = (event) => {
      const detail = event.detail;
      if (detail && detail.column && detail.column.prop) {
        setColumnSizes(prev => {
          const newSizes = new Map(prev);
          newSizes.set(detail.column.prop, detail.column.size);
          return newSizes;
        });
      }
    };

    // Listen for column resize events
    const eventNames = ['aftercolumnresize', 'columnresize', 'aftercolumnsresize'];
    eventNames.forEach(eventName => {
      gridElement.addEventListener(eventName, handleResize);
    });

    return () => {
      eventNames.forEach(eventName => {
        gridElement.removeEventListener(eventName, handleResize);
      });
    };
  }, []);

  // Create column definitions with preserved sizes
  const enhancedColumnDefs = React.useMemo(() => {
    return columnDefs.map(col => {
      const savedSize = columnSizes.get(col.prop);
      return {
        ...col,
        size: savedSize || col.size || 150
      };
    });
  }, [columnDefs, columnSizes]);

  // Stable column reference to prevent unnecessary re-renders
  const stableColumnDefs = React.useRef(enhancedColumnDefs);
  
  React.useEffect(() => {
    // Only update if the column structure has changed (not just sizes)
    const structureChanged = stableColumnDefs.current.length !== enhancedColumnDefs.length ||
      stableColumnDefs.current.some((col, index) => 
        col.prop !== enhancedColumnDefs[index]?.prop || 
        col.name !== enhancedColumnDefs[index]?.name
      );
    
    if (structureChanged) {
      stableColumnDefs.current = enhancedColumnDefs;
    } else {
      // Only update sizes in the existing reference to preserve grid state
      stableColumnDefs.current.forEach((col, index) => {
        if (enhancedColumnDefs[index] && col.prop === enhancedColumnDefs[index].prop) {
          col.size = enhancedColumnDefs[index].size;
        }
      });
    }
  }, [enhancedColumnDefs]);

  // Alternative approach: use MutationObserver to detect column width changes
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target && target.tagName === 'TH' && target.style.width) {
            const columnProp = target.getAttribute('data-prop') || target.getAttribute('data-column-prop');
            if (columnProp) {
              const width = parseInt(target.style.width);
              if (!isNaN(width)) {
                console.log(`Column ${columnProp} width changed to ${width}px via DOM`);
                setColumnSizes(prev => {
                  const newSizes = new Map(prev);
                  newSizes.set(columnProp, width);
                  return newSizes;
                });
              }
            }
          }
        }
      });
    });

    // Observe the grid element for changes
    observer.observe(gridElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, []);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(currentMappings);
    }
  }, [currentMappings, onDataChange]);

  // Handle column resize to preserve sizes
  const handleColumnResize = useCallback((event) => {
    console.log('Column resize event:', event.detail);
    const detail = event.detail;
    if (detail && detail.column && detail.column.prop) {
      console.log(`Resizing column ${detail.column.prop} to size ${detail.column.size}`);
      setColumnSizes(prev => {
        const newSizes = new Map(prev);
        newSizes.set(detail.column.prop, detail.column.size);
        console.log('Updated column sizes:', newSizes);
        return newSizes;
      });
    }
  }, []);

  // Handle cell editing
  const handleBeforeEdit = useCallback((event) => {
    const detail = event.detail;
    let columnProp = detail.prop || detail.model?.prop || detail.column?.prop;
    
    if (!columnProp && detail.rgCol !== undefined) {
      const column = stableColumnDefs.current[detail.rgCol];
      columnProp = column?.prop;
    }

    const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
    const staticColumn = staticColumns.find(col => col.prop === columnProp);
    
    // For standalone grids, allow editing of static columns that are not readonly
    // For mapping grids, allow editing of dynamic columns and non-readonly static columns
    const canEdit = isStandaloneGrid 
      ? (isStaticColumn && !staticColumn?.readonly)
      : (isEditableColumn(columnProp) || (isStaticColumn && !staticColumn?.readonly));
    
    if (!canEdit) {
      event.preventDefault();
      return;
    }

    // Override RevoGrid validation to allow empty values
    if (detail.model) {
      detail.model.allowEmpty = true;
    }
    
    if (detail.column) {
      detail.column.readonly = false;
      if (detail.column.validator) {
        detail.column.validator = () => true;
      }
    }
  }, [columnDefs, isStandaloneGrid, staticColumns, isEditableColumn]);

  const handleAfterEdit = useCallback((event) => {
    const detail = event.detail;
    
    // Handle range edits
    if (detail.newRange || detail.oldRange) {
      const { data, newRange } = detail;
      
      if (!data || !newRange) return;
      
      const updates = [];
      const rowDataUpdates = []; // For standalone grids
      
      for (let rowIndex = newRange.y; rowIndex <= (newRange.y1 || newRange.y); rowIndex++) {
        for (let colIndex = newRange.x; colIndex <= (newRange.x1 || newRange.x); colIndex++) {
          const column = stableColumnDefs.current[colIndex];
          if (!column) continue;
          
          const columnProp = column.prop;
          const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
          const staticColumn = staticColumns.find(col => col.prop === columnProp);
          
          // Skip if column is not editable
          if (!isEditableColumn(columnProp) && (!isStaticColumn || staticColumn?.readonly)) {
            continue;
          }
          
          const row = getRowByIndex(rowIndex);
          if (!row) continue;
          
          let newValue;
          if (data[rowIndex]) {
            newValue = data[rowIndex][columnProp];
          } else if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
            const rowData = data.find(r => r.id === row.id || r[fields.rowName] === row[fields.rowName]);
            if (rowData) {
              newValue = rowData[columnProp];
            }
          }
          
          if (newValue === undefined || newValue === null) continue;
          
          const stringValue = String(newValue);
          
          if (isStandaloneGrid && isStaticColumn) {
            // Handle row data updates for standalone grids
            rowDataUpdates.push({
              rowId: row[fields.rowId],
              columnProp,
              value: stringValue
            });
          } else if (!isStandaloneGrid && isEditableColumn(columnProp)) {
            // Handle mapping updates for mapping grids
            updates.push({
              rowId: row[fields.rowId],
              columnId: columnProp,
              value: stringValue
            });
          }
        }
      }
      
      // Process standalone grid row data updates
      if (rowDataUpdates.length > 0 && isStandaloneGrid) {
        // Group updates by row for efficiency
        const rowUpdatesMap = new Map();
        rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
          if (!rowUpdatesMap.has(rowId)) {
            rowUpdatesMap.set(rowId, {});
          }
          rowUpdatesMap.get(rowId)[columnProp] = value;
        });
        
        // Apply all updates to create new row data
        const currentData = [...gridData.map(row => ({ ...row }))];
        
        rowUpdatesMap.forEach((columnUpdates, rowId) => {
          const rowToUpdate = currentData.find(r => r[fields.rowId] === rowId);
          if (rowToUpdate) {
            Object.assign(rowToUpdate, columnUpdates);
          }
        });
        
        // Use the hook's internal row data tracking for undo/redo
        updateRowDataBatch(currentData);
      }
      
      // Process mapping updates
      if (updates.length > 0) {
        updateMappingsBatch(updates);
      }
      return;
    }
    
    // Handle single cell edit
    const columnProp = detail.prop || detail.model?.prop || detail.column?.prop;
    let newValue = detail.val !== undefined ? detail.val : detail.value;
    const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;
    
    // Handle RevoGrid reverting empty values
    if (detail.val !== undefined && detail.val === '' && detail.value !== '') {
      newValue = detail.val;
    }

    const row = getRowByIndex(rowIndex);
    if (!row) {
      return;
    }

    const stringValue = (newValue === undefined || newValue === null || newValue === '') ? '' : String(newValue);
    
    // Check if this is a static column (row data) edit or a dynamic column (mapping) edit
    const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
    
    if (isStaticColumn) {
      // Handle row data edit for standalone grids
      if (isStandaloneGrid) {
        // Use the hook's updateRowData function which includes history tracking
        updateRowData(row[fields.rowId], columnProp, stringValue);
      } else {
        // For non-standalone grids, use the old method with onRowDataChange callback
        if (onRowDataChange) {
          const updatedRowData = [...rowData];
          const rowToUpdate = updatedRowData.find(r => r[fields.rowId] === row[fields.rowId]);
          if (rowToUpdate) {
            rowToUpdate[columnProp] = stringValue;
            onRowDataChange(updatedRowData);
          }
        }
      }
    } else if (isEditableColumn(columnProp)) {
      // Handle mapping edit (existing functionality)
      updateMapping(row[fields.rowId], columnProp, stringValue);
    }
  }, [stableColumnDefs, staticColumns, isStandaloneGrid, isEditableColumn, getRowByIndex, updateMapping, updateMappingsBatch, updateRowDataBatch, gridData, fields, onRowDataChange]);

  const handleBeforeRangeEdit = useCallback((event) => {
    const detail = event.detail;
    const { newRange } = detail;
    
    if (newRange && stableColumnDefs.current) {
      const rangeStartCol = newRange.x;
      const rangeEndCol = newRange.x1 || rangeStartCol;
      
      for (let colIndex = rangeStartCol; colIndex <= rangeEndCol; colIndex++) {
        const column = stableColumnDefs.current[colIndex];
        if (column) {
          const isStaticColumn = staticColumns.some(col => col.prop === column.prop);
          const staticColumn = staticColumns.find(col => col.prop === column.prop);
          
          // For standalone grids, allow editing of static columns that are not readonly
          // For mapping grids, allow editing of dynamic columns and non-readonly static columns
          const canEdit = isStandaloneGrid 
            ? (isStaticColumn && !staticColumn?.readonly)
            : (isEditableColumn(column.prop) || (isStaticColumn && !staticColumn?.readonly));
          
          if (!canEdit) {
            event.preventDefault();
            return;
          }
        }
      }
    }
  }, [stableColumnDefs, isStandaloneGrid, staticColumns, isEditableColumn]);

  const handleAfterRangeEdit = useCallback((event) => {
    // Range edits are handled in handleAfterEdit
    handleAfterEdit(event);
  }, [handleAfterEdit]);

  // Handle keyboard shortcuts
  const handleClearCell = useCallback(() => {
    const gridElement = document.querySelector('revo-grid');
    if (!gridElement) return false;
    
    try {
      const focusedCell = gridElement.querySelector('[data-rgrow][data-rgcol].focused') ||
                         gridElement.querySelector('[data-rgrow][data-rgcol][tabindex="0"]') ||
                         gridElement.querySelector('[data-rgrow][data-rgcol].selected');
      
      if (focusedCell) {
        const rgRow = parseInt(focusedCell.getAttribute('data-rgrow') || '0', 10);
        const rgCol = parseInt(focusedCell.getAttribute('data-rgcol') || '0', 10);
        
        const column = stableColumnDefs.current[rgCol];
        if (!column) return false;
        
        const row = getRowByIndex(rgRow);
        if (!row) return false;
        
        // Handle clearing cells in standalone grids vs mapping grids
        const isStaticColumn = staticColumns.some(col => col.prop === column.prop);
        
        if (isStandaloneGrid && isStaticColumn) {
          // Clear row data cell in standalone grid
          updateRowData(row[fields.rowId], column.prop, '');
          return true;
        } else if (!isStandaloneGrid && isEditableColumn(column.prop)) {
          // Clear mapping cell in mapping grid
          updateMapping(row[fields.rowId], column.prop, '');
          return true;
        }
      }
    } catch (error) {
      console.error('Error clearing cell:', error);
    }
    
    return false;
  }, [stableColumnDefs, isStandaloneGrid, staticColumns, getRowByIndex, updateRowData, isEditableColumn, updateMapping, fields]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isEditingCell = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.closest('[contenteditable]') ||
        activeElement.hasAttribute('contenteditable')
      );

      if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditingCell) {
        if (handleClearCell()) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (isEditingCell) return;

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          undo();
        } else if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          event.stopPropagation();
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo, handleClearCell]);

  return (
    <div className={`data-grid ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-gray-600">
          Rows: {stats.totalRows} | Columns: {stats.totalColumns} | Mappings: {stats.totalMappings}
          {stats.totalRows > 0 && stats.totalColumns > 0 && ` | Coverage: ${stats.coverage}%`}
        </p>
        
        {/* Controls */}
        {showControls && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`px-3 py-1 text-sm rounded border ${
                canUndo 
                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' 
                  : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`px-3 py-1 text-sm rounded border ${
                canRedo 
                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' 
                  : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
            
            {stats.totalMappings > 0 && (
              <button
                onClick={clearAllMappings}
                className="px-3 py-1 text-sm rounded border bg-red-50 text-red-700 border-red-300 hover:bg-red-100 ml-4"
                title="Clear all values"
              >
                🗑️ Clear All
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Grid */}
      <RevoGrid
        ref={gridRef}
        style={{ height }}
        source={gridData}
        rowSize={rowsize}
        columns={stableColumnDefs.current}
        onBeforeedit={handleBeforeEdit}
        onAfteredit={handleAfterEdit}
        onBeforerangeedit={handleBeforeRangeEdit}
        onAfterangeedit={handleAfterRangeEdit}
        onAftercolumnresize={handleColumnResize}
        onColumnresize={handleColumnResize}
        onAftercolumnsresize={handleColumnResize}
        readonly={false}
        resize={true}
        range={true}
        // stretch={true}
        canFocus={true}
        editors={{
          string: {
            type: 'input',
            validator: () => true
          }
        }}
        {...gridProps}
      />

      {/* Debug View */}
      {showDebug && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Debug: Current Data</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Mappings */}
            <div>
              <h4 className="font-medium mb-2">Raw Mappings ({currentMappings.length})</h4>
              <div className="max-h-64 overflow-y-auto bg-white p-3 rounded border">
                {currentMappings.length === 0 ? (
                  <p className="text-gray-500 italic">No mappings found</p>
                ) : (
                  <pre className="text-xs">{JSON.stringify(currentMappings, null, 2)}</pre>
                )}
              </div>
            </div>

            {/* Grid Data */}
            <div>
              <h4 className="font-medium mb-2">Grid Data ({gridData.length} rows)</h4>
              <div className="max-h-64 overflow-y-auto bg-white p-3 rounded border">
                <pre className="text-xs">{JSON.stringify(gridData, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
