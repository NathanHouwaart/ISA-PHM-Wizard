import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { useDataGrid } from '../hooks/useDataGrid';
import "./GridTable/GridTable.css";

/**
 * Generic DataGrid component that handles any type of data with optional mapping functionality.
 * 
 * Features:
 * - Standalone mode: Direct editing of row data (studies, variables, etc.)
 * - Mapping mode: Cross-referencing between row and column data with editable mappings
 * - Column resizing: User-resized column widths persist across re-renders and edits
 * - Undo/Redo: Full history tracking for both data edits and structure changes
 * - Range editing: Multi-cell selection and editing capabilities
 * - Keyboard shortcuts: Delete/Backspace to clear cells, Ctrl+Z/Y for undo/redo
 */
const DataGrid = forwardRef(({
    // Data configuration
    rowData = [],           // Array of row objects (e.g., studies, sensors)
    columnData = [],        // Array of column objects (e.g., variables, protocols) - optional for standalone mode
    mappings = [],          // Array of mapping objects between rows and columns - optional for standalone mode

    // Field mapping configuration for flexibility
    fieldMappings = {},     // Object mapping field names for different data structures

    // Static columns configuration
    staticColumns = [],     // Static columns always shown (e.g., name, description)

    // Grid display configuration
    height = '600px',       // Grid height
    title = 'Data Grid',    // Grid title
    showControls = true,    // Show undo/redo controls
    showDebug = false,      // Show debug information
    rowsize = 50,           // Row height in pixels
    isActive = true,        // Whether this grid is active (should respond to global undo/redo)

    // Event handlers
    onDataChange,           // Callback when mapping data changes
    onRowDataChange,        // Callback when row data changes (standalone mode)

    // Custom actions for controls
    customActions = [],     // Array of custom action buttons to add to controls

    // Plugins for RevoGrid
    plugins = {},           // Plugins to enhance grid functionality

    // Other props
    className = '',
    ...gridProps            // Additional RevoGrid props
}, ref) => {

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
    fields,
    rowData: hookRowData
    } = useDataGrid({
        rowData,
        columnData,
        mappings,
        fieldMappings,
        staticColumns,
        onRowDataChange // Pass the callback to the hook
    });

    // Expose functions to parent components through ref
    useImperativeHandle(ref, () => ({
        addRow: (newRow) => {
            updateRowDataBatch([...hookRowData, newRow]);
        },
        removeRow: (index) => {
            const newData = hookRowData.filter((_, i) => i !== index);
            updateRowDataBatch(newData);
        },
        removeLastRow: () => {
            if (hookRowData.length > 0) {
                const newData = hookRowData.slice(0, -1);
                updateRowDataBatch(newData);
            }
        },
        updateRowDataBatch,
        getCurrentData: () => hookRowData
    }), [hookRowData, updateRowDataBatch]);

    // State to track column sizes to preserve across re-renders
    // This prevents columns from resetting to their original size after edits
    const [columnSizes, setColumnSizes] = useState(() => new Map());
    // Also keep a ref for synchronous updates to avoid races between event handler
    // updates and later effects that read the state (which is async).
    const columnSizesRef = useRef(columnSizes);
    const gridRef = useRef();

    // Listen for column resize events to preserve user adjustments
    useEffect(() => {
        const gridElement = gridRef.current;
        if (!gridElement) {
            return;
        }

        const handleResize = (event) => {
            const detail = event.detail;
            
            // RevoGrid sends column info as detail[columnIndex]
            const columnKeys = Object.keys(detail);
            if (columnKeys.length > 0) {
                const columnIndex = columnKeys[0];
                const column = detail[columnIndex];
                
                if (column && column.prop && column.size) {
                    // Persist size in the map
                    setColumnSizes(prev => {
                        const newSizes = new Map(prev);
                        newSizes.set(column.prop, column.size);
                        // sync ref so subsequent immediate computations see the new size
                        columnSizesRef.current = newSizes;
                        return newSizes;
                    });

                    // Also apply the new size immediately to the active column defs
                    // so RevoGrid receives the update synchronously and doesn't snap back.
                    setAppliedColumns(prevCols => {
                        const updated = prevCols.map(c => {
                            // Update top-level column match
                            if (c.prop === column.prop) {
                                return { ...c, size: column.size };
                            }

                            // If parent has children, update the matching child
                            if (c.children && Array.isArray(c.children)) {
                                const children = c.children.map(child => {
                                    if (child.prop === column.prop) {
                                        return { ...child, size: column.size };
                                    }
                                    return child;
                                });
                                return { ...c, children };
                            }

                            return c;
                        });
                        // Keep internal refs in sync
                        stableColumnDefs.current = updated;
                        lastEnhancedColumnsRef.current = updated;
                        return updated;
                    });
                }
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

    // Enhanced column definitions that preserve user-resized widths
    const enhancedColumnDefs = React.useMemo(() => {
        // Use the synchronous ref if available to avoid races when a resize event
        // just updated the ref but the state update hasn't propagated yet.
        const sizesMap = columnSizesRef.current || columnSizes;
        return columnDefs.map(col => {
            const savedSize = sizesMap.get(col.prop);
            const finalSize = savedSize || col.size || 150;

            // If column has child columns, apply saved sizes to children as well
            if (col.children && Array.isArray(col.children)) {
                const children = col.children.map(child => {
                    const childSaved = sizesMap.get(child.prop);
                    const childSize = childSaved || child.size || 100;
                    return { ...child, size: childSize };
                });
                return { ...col, size: finalSize, children };
            }

            return { ...col, size: finalSize };
        });
    }, [columnDefs, columnSizes]);

    // Force re-render when columns change by using state instead of just ref
    const [appliedColumns, setAppliedColumns] = useState(enhancedColumnDefs);
    
    // Keep a ref for internal logic that needs column definitions
    const stableColumnDefs = React.useRef(enhancedColumnDefs);
    const lastEnhancedColumnsRef = React.useRef(enhancedColumnDefs);

    React.useEffect(() => {
        // Only update if the columns actually changed (deep comparison of structure and sizes)
        const columnsChanged = enhancedColumnDefs.length !== lastEnhancedColumnsRef.current.length ||
            enhancedColumnDefs.some((col, index) => {
                const lastCol = lastEnhancedColumnsRef.current[index];
                return !lastCol || col.prop !== lastCol.prop || col.size !== lastCol.size || col.name !== lastCol.name;
            });

        if (columnsChanged) {
            // Merge in any user-saved sizes from the synchronous ref so we don't
            // overwrite a user's recent resize when columns are recalculated.
            const sizesMap = columnSizesRef.current || columnSizes;
            const merged = enhancedColumnDefs.map(col => {
                const saved = sizesMap.get(col.prop);
                if (saved && saved !== col.size) {
                    return { ...col, size: saved };
                }
                return col;
            });

            setAppliedColumns(merged);
            stableColumnDefs.current = merged;
            lastEnhancedColumnsRef.current = merged;
        }
    }, [enhancedColumnDefs]);

    // Notify parent of data changes
    useEffect(() => {
        if (onDataChange) {
            onDataChange(currentMappings);
        }
    }, [currentMappings, onDataChange]);

    // Handle cell editing
    const handleBeforeEdit = useCallback((event) => {
        const detail = event.detail;
        let columnProp = detail.prop || detail.model?.prop || detail.column?.prop;

        if (!columnProp && detail.rgCol !== undefined) {
            const column = appliedColumns[detail.rgCol];
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
    }, [stableColumnDefs, isStandaloneGrid, staticColumns, isEditableColumn]);

    const handleAfterEdit = useCallback((event) => {
        const detail = event.detail;

        // Handle range edits
        if (detail.newRange || detail.oldRange) {
            const { data, newRange } = detail;

            if (!data || !newRange) return;

            const updates = [];
            const rowDataUpdates = []; // For standalone grids

            // For child columns, we need to handle the flattened structure differently
            // RevoGrid flattens child columns, so we need to map the column indexes correctly
            const flatColumnDefs = [];
            stableColumnDefs.current.forEach(col => {
                if (col.children) {
                    // Add child columns to flat structure
                    col.children.forEach(child => {
                        flatColumnDefs.push(child);
                    });
                } else {
                    flatColumnDefs.push(col);
                }
            });

            for (let rowIndex = newRange.y; rowIndex <= (newRange.y1 || newRange.y); rowIndex++) {
                for (let colIndex = newRange.x; colIndex <= (newRange.x1 || newRange.x); colIndex++) {
                    // Use flatColumnDefs for child column support
                    const column = flatColumnDefs[colIndex];
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

                    if (isStaticColumn) {
                        // Static columns represent row-data properties (e.g., type, unit, description)
                        // Treat them as row updates in both standalone and mapping grids.
                        rowDataUpdates.push({
                            rowId: row[fields.rowId],
                            columnProp,
                            value: stringValue
                        });
                    } else if (!isStandaloneGrid && isEditableColumn(columnProp)) {
                        // Handle mapping updates for dynamic columns in mapping grids
                        updates.push({
                            rowId: row[fields.rowId],
                            columnId: columnProp,
                            value: stringValue
                        });
                    }
                }
            }

            // Process row data updates (for both standalone and mapping grids)
            if (rowDataUpdates.length > 0) {
                // Group updates by row for efficiency
                const rowUpdatesMap = new Map();
                rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
                    if (!rowUpdatesMap.has(rowId)) {
                        rowUpdatesMap.set(rowId, {});
                    }
                    rowUpdatesMap.get(rowId)[columnProp] = value;
                });

                // Apply all updates to create new row data using the authoritative `rowData` prop
                const currentData = [...rowData.map(row => ({ ...row }))];

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
            // Use the hook's updateRowData for both standalone and mapping grids so
            // the row-data change is recorded in the unified undo/redo history.
            updateRowData(row[fields.rowId], columnProp, stringValue);
        } else if (isEditableColumn(columnProp)) {
            // Handle mapping edit (existing functionality)
            updateMapping(row[fields.rowId], columnProp, stringValue);
        }
    }, [stableColumnDefs, staticColumns, isStandaloneGrid, isEditableColumn, getRowByIndex, updateMapping, updateMappingsBatch, updateRowDataBatch, gridData, fields, onRowDataChange]);

    const handleBeforeRangeEdit = useCallback((event) => {
        const detail = event.detail;
        const { newRange } = detail;

        if (newRange && stableColumnDefs.current) {
            // Create flattened column structure for child column support
            const flatColumnDefs = [];
            stableColumnDefs.current.forEach(col => {
                if (col.children) {
                    // Add child columns to flat structure
                    col.children.forEach(child => {
                        flatColumnDefs.push(child);
                    });
                } else {
                    flatColumnDefs.push(col);
                }
            });

            const rangeStartCol = newRange.x;
            const rangeEndCol = newRange.x1 || rangeStartCol;

            for (let colIndex = rangeStartCol; colIndex <= rangeEndCol; colIndex++) {
                const column = flatColumnDefs[colIndex];
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

                // Create flattened column structure for child column support
                const flatColumnDefs = [];
                stableColumnDefs.current.forEach(col => {
                    if (col.children) {
                        // Add child columns to flat structure
                        col.children.forEach(child => {
                            flatColumnDefs.push(child);
                        });
                    } else {
                        flatColumnDefs.push(col);
                    }
                });

                const column = flatColumnDefs[rgCol];
                if (!column) return false;

                const row = getRowByIndex(rgRow);
                if (!row) return false;

                // Handle clearing cells in standalone grids vs mapping grids
                const isStaticColumn = staticColumns.some(col => col.prop === column.prop);

                if (isStaticColumn) {
                    // Static columns are row-data fields; clear via updateRowData in both modes
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
        if (!isActive) return; // Only handle global keys when this grid is active
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

    // Render the complete data grid with controls and debug view
    return (
        <div className={`data-grid ${className}`}>
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                {/* <p className="text-gray-600">
                    Rows: {stats.totalRows} | Columns: {stats.totalColumns} | Mappings: {stats.totalMappings}
                    {stats.totalRows > 0 && stats.totalColumns > 0 && ` | Coverage: ${stats.coverage}%`}
                </p> */}

                {/* Controls */}
                {showControls && (
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`px-3 py-1 text-sm rounded border ${canUndo
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
                            className={`px-3 py-1 text-sm rounded border ${canRedo
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                }`}
                            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                        >
                            ↷ Redo
                        </button>

                        {/* Custom Actions */}
                        {customActions.length > 0 && (
                            <>
                                <div className="border-l border-gray-300 h-6 mx-2"></div>
                                {customActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        className={action.className || `px-3 py-1 text-sm rounded border ${
                                            action.disabled
                                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                        title={action.title}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </>
                        )}

                        {stats.totalMappings > 0 && (
                            <>
                                <div className="border-l border-gray-300 h-6 mx-2"></div>
                                <button
                                    onClick={clearAllMappings}
                                    className="px-3 py-1 text-sm rounded border bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                                    title="Clear all values"
                                >
                                    🗑️ Clear All
                                </button>
                            </>
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
                columns={appliedColumns}
                onBeforeedit={handleBeforeEdit}
                onAfteredit={handleAfterEdit}
                onBeforerangeedit={handleBeforeRangeEdit}
                onAfterangeedit={handleAfterRangeEdit}
                readonly={false}
                resize={true}
                range={true}
                canFocus={true}
                columnTypes={plugins}
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
});

export default DataGrid;
