import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { useDataGrid } from '../../hooks/useDataGrid';
import "./DataGrid.css";

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
    // Action plugins rendered in the controls area (components or elements)
    actionPlugins = [],         // optional array of plugin components/elements

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

    // (removed) currentMappingsCount — was only used by debug UI which we removed

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
    // callback ref to ensure we store the underlying DOM element (revo-grid)

    const setGridRef = (node) => {
        if (!node) {
            gridRef.current = null;
            return;
        }
        // If the React wrapper forwards the webcomponent under .element or .el, prefer that
        if (node instanceof HTMLElement && node.tagName?.toLowerCase() === 'revo-grid') {
            gridRef.current = node;
        } else if (node && node.element instanceof HTMLElement) {
            gridRef.current = node.element;
        } else if (node && node.el instanceof HTMLElement) {
            gridRef.current = node.el;
        } else {
            // fallback to whatever was provided
            gridRef.current = node;
        }
    };
    // Refs for file plugin (managed inside plugin)
    // Key to force RevoGrid remount when necessary
    const [gridKey, setGridKey] = useState(0);

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

    // Listen for deleteRow events dispatched from cell templates (or document fallback)
    useEffect(() => {
        const gridElement = gridRef.current;

        const handleDeleteRequest = (event) => {
            try {
                const { rowIndex, rowId } = event.detail || {};

                // Prefer using rowId if provided (stable), otherwise fall back to rowIndex
                let newData = [];
                if (rowId !== undefined && rowId !== null) {
                    newData = hookRowData.filter(r => r.id !== rowId);
                } else if (typeof rowIndex === 'number') {
                    newData = hookRowData.filter((_, i) => i !== rowIndex);
                }

                if (newData.length > -1) {
                    updateRowDataBatch(newData);
                }
            } catch (err) {
                console.error('Error handling deleteRow event', err);
            }
        };

        if (gridElement) {
            gridElement.addEventListener('deleteRow', handleDeleteRequest);
        }

        // Also listen on document as fallback when the cell template couldn't find revo-grid
        document.addEventListener('deleteRow', handleDeleteRequest);

        return () => {
            if (gridElement) {
                gridElement.removeEventListener('deleteRow', handleDeleteRequest);
            }
            document.removeEventListener('deleteRow', handleDeleteRequest);
        };
    }, [hookRowData, updateRowDataBatch]);

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

    // Helper: return flattened columns in RevoGrid's internal order
    // RevoGrid orders columns as: colPinStart, rgCol, colPinEnd
    const getFlatColumns = useCallback(() => {
        const colPinStart = [];
        const rgCol = [];
        const colPinEnd = [];
        
        // Separate columns by pin type and flatten grouped columns
        (stableColumnDefs.current || []).forEach(col => {
            if (col && col.children) {
                // Handle grouped columns
                col.children.forEach(ch => {
                    if (ch.pin === 'colPinStart') {
                        colPinStart.push(ch);
                    } else if (ch.pin === 'colPinEnd') {
                        colPinEnd.push(ch);
                    } else {
                        rgCol.push(ch);
                    }
                });
            } else if (col) {
                // Handle regular columns
                if (col.pin === 'colPinStart') {
                    colPinStart.push(col);
                } else if (col.pin === 'colPinEnd') {
                    colPinEnd.push(col);
                } else {
                    rgCol.push(col);
                }
            }
        });
        
        // Return in RevoGrid's internal order: pinned start, regular, pinned end
        return [...colPinStart, ...rgCol, ...colPinEnd];
    }, []);

    // Helper: translate RevoGrid's type-relative coordinates to global coordinates
    // RevoGrid provides coordinates relative to column type (colPinStart, rgCol, colPinEnd)
    // but we need global coordinates for our flat columns array
    const translateRangeCoordinates = useCallback((range) => {
        console.log('[DataGrid] translateRangeCoordinates input:', range);
        
        // If no colType or coordinates, return as-is (may be already translated)
        if (!range || !range.colType || (range.x === undefined && range.y === undefined)) {
            console.log('[DataGrid] No colType or coordinates, returning range as-is');
            return range;
        }
        
        const flatCols = getFlatColumns();
        console.log('[DataGrid] flatCols:', flatCols.map(c => ({ prop: c.prop, pin: c.pin })));
        
        let offset = 0;
        const colTypeOrder = ['colPinStart', 'rgCol', 'colPinEnd'];
        const currentTypeIndex = colTypeOrder.indexOf(range.colType);
        
        console.log('[DataGrid] colType:', range.colType, 'currentTypeIndex:', currentTypeIndex);
        
        // If colType not found in order, return as-is
        if (currentTypeIndex < 0) {
            console.log('[DataGrid] colType not in standard order, returning as-is');
            return range;
        }
        
        // Count columns before current type
        for (let i = 0; i < currentTypeIndex; i++) {
            const colType = colTypeOrder[i];
            const colsOfType = flatCols.filter(col => 
                colType === 'rgCol' ? !col.pin : col.pin === colType
            );
            console.log('[DataGrid] colType', colType, 'has', colsOfType.length, 'columns');
            offset += colsOfType.length;
        }
        
        const translated = {
            ...range,
            x: range.x + offset,
            x1: range.x1 + offset
        };
        
        console.log('[DataGrid] Translated coordinates:', {
            original: { x: range.x, x1: range.x1 },
            offset,
            translated: { x: translated.x, x1: translated.x1 }
        });
        
        return translated;
    }, [getFlatColumns]);

    // Helper: get current mapping value for a row/column combination
    const getCurrentMapping = useCallback((rowId, columnId) => {
        const mapping = currentMappings.find(m => 
            m[fields.sourceId] === rowId && m[fields.targetId] === columnId
        );
        return mapping ? mapping[fields.value] : '';
    }, [currentMappings, fields]);

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
        console.log('[DataGrid] handleAfterEdit event detail:', detail);

        // Handle range edits
        if (detail.newRange || detail.oldRange) {
            console.log('[DataGrid] Processing range edit:', {
                newRange: detail.newRange,
                oldRange: detail.oldRange,
                data: detail.data
            });
            
            const { data, newRange } = detail;

            if (!data || !newRange) {
                console.log('[DataGrid] Missing data or newRange, aborting');
                return;
            }

            const updates = [];
            const rowDataUpdates = []; // For standalone grids

            // CRITICAL: Do NOT use translated coordinates to iterate!
            // RevoGrid's data object already has correct column props as keys.
            // Using translated coordinates with flattened columns array causes misalignment
            // because RevoGrid's coordinate system doesn't account for child columns in the same way.
            
            console.log('[DataGrid] Processing range edit data directly by keys');

            // Iterate through data by rowIndex, then by columnProp
            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);
                
                if (!row) {
                    console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }

                // Iterate through all column props in this row's data
                for (const [columnProp, newValue] of Object.entries(rowDataObj)) {
                    if (newValue === undefined || newValue === null) continue;

                    const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
                    const staticColumn = staticColumns.find(col => col.prop === columnProp);

                    // Skip readonly columns
                    if (staticColumn?.readonly) continue;

                    // Skip non-editable columns
                    if (!isEditableColumn(columnProp) && !isStaticColumn) continue;

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
        console.log('[DataGrid] Processing single cell edit');
        const columnProp = detail.prop || detail.model?.prop || detail.column?.prop;
        let newValue = detail.val !== undefined ? detail.val : detail.value;
        const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;

        console.log('[DataGrid] Single cell edit details:', {
            columnProp,
            newValue,
            rowIndex,
            detailProps: Object.keys(detail)
        });

        // Handle RevoGrid reverting empty values
        if (detail.val !== undefined && detail.val === '' && detail.value !== '') {
            newValue = detail.val;
        }

        const row = getRowByIndex(rowIndex);
        if (!row) {
            console.log('[DataGrid] Row not found for index:', rowIndex);
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
    }, [translateRangeCoordinates, getFlatColumns, staticColumns, isStandaloneGrid, isEditableColumn, getRowByIndex, updateMapping, updateMappingsBatch, updateRowDataBatch, rowData, fields]);

    const handleBeforeRangeEdit = useCallback((event) => {
        const detail = event.detail;
        const { newRange } = detail;

        if (newRange) {
            // Translate RevoGrid's type-relative coordinates to global coordinates
            const translatedRange = translateRangeCoordinates(newRange);

            // Use getFlatColumns for consistent column mapping
            const flatColumnDefs = getFlatColumns();

            const rangeStartCol = translatedRange.x;
            const rangeEndCol = translatedRange.x1 || rangeStartCol;

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
    }, [translateRangeCoordinates, getFlatColumns, isStandaloneGrid, staticColumns, isEditableColumn]);

    const handleAfterRangeEdit = useCallback((event) => {
        // Range edits are handled in handleAfterEdit
        handleAfterEdit(event);
    }, [handleAfterEdit]);

    // Handle keyboard shortcuts
    const handleClearCell = useCallback(async () => {
        console.log('[DataGrid] handleClearCell called');
        const gridElement = gridRef.current;
        if (!gridElement) {
            console.log('[DataGrid] No grid element found');
            return false;
        }

        try {
            // Use the grid's getSelectedRange API instead of DOM parsing
            if (typeof gridElement.getSelectedRange === 'function') {
                const selectedRange = await gridElement.getSelectedRange();
                console.log('[DataGrid] Selected range for clear:', selectedRange);
                
                if (selectedRange) {
                    // Translate coordinates if we have colType
                    const translatedRange = translateRangeCoordinates(selectedRange);
                    console.log('[DataGrid] Translated range for clear:', translatedRange);
                    
                    const flatColumnDefs = getFlatColumns();
                    const updates = [];
                    const rowDataUpdates = [];

                    // Clear all cells in the translated range
                    for (let rowIndex = translatedRange.y; rowIndex <= (translatedRange.y1 || translatedRange.y); rowIndex++) {
                        for (let colIndex = translatedRange.x; colIndex <= (translatedRange.x1 || translatedRange.x); colIndex++) {
                            const column = flatColumnDefs[colIndex];
                            if (!column) continue;

                            const row = getRowByIndex(rowIndex);
                            if (!row) continue;

                            const isStaticColumn = staticColumns.some(col => col.prop === column.prop);
                            const staticColumn = staticColumns.find(col => col.prop === column.prop);

                            // Skip readonly columns
                            if (isStaticColumn && staticColumn?.readonly) continue;
                            if (!isStandaloneGrid && !isEditableColumn(column.prop) && !isStaticColumn) continue;

                            if (isStaticColumn) {
                                // Clear static column (row data)
                                rowDataUpdates.push({
                                    rowId: row[fields.rowId],
                                    columnProp: column.prop,
                                    value: ''
                                });
                            } else if (!isStandaloneGrid && isEditableColumn(column.prop)) {
                                // Clear mapping cell
                                updates.push({
                                    rowId: row[fields.rowId],
                                    columnId: column.prop,
                                    value: ''
                                });
                            }
                        }
                    }

                    // Apply updates
                    if (rowDataUpdates.length > 0) {
                        // Group row updates by row ID
                        const rowUpdatesMap = new Map();
                        rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
                            if (!rowUpdatesMap.has(rowId)) {
                                rowUpdatesMap.set(rowId, {});
                            }
                            rowUpdatesMap.get(rowId)[columnProp] = value;
                        });

                        // Apply row data updates
                        const currentData = [...rowData.map(row => ({ ...row }))];
                        rowUpdatesMap.forEach((columnUpdates, rowId) => {
                            const rowToUpdate = currentData.find(r => r[fields.rowId] === rowId);
                            if (rowToUpdate) {
                                Object.assign(rowToUpdate, columnUpdates);
                            }
                        });
                        updateRowDataBatch(currentData);
                    }

                    if (updates.length > 0) {
                        updateMappingsBatch(updates);
                    }

                    return true;
                }
            }

            // Fallback to old DOM-based method if getSelectedRange is not available
            const focusedCell = gridElement.querySelector('[data-rgrow][data-rgcol].focused') ||
                gridElement.querySelector('[data-rgrow][data-rgcol][tabindex="0"]') ||
                gridElement.querySelector('[data-rgrow][data-rgcol].selected');

            if (focusedCell) {
                const rgRow = parseInt(focusedCell.getAttribute('data-rgrow') || '0', 10);
                const rgCol = parseInt(focusedCell.getAttribute('data-rgcol') || '0', 10);
                
                console.log('[DataGrid] Found focused cell (fallback):', { rgRow, rgCol });

                const flatColumnDefs = getFlatColumns();
                const column = flatColumnDefs[rgCol];
                if (!column) return false;

                const row = getRowByIndex(rgRow);
                if (!row) return false;

                const isStaticColumn = staticColumns.some(col => col.prop === column.prop);

                if (isStaticColumn) {
                    updateRowData(row[fields.rowId], column.prop, '');
                    return true;
                } else if (!isStandaloneGrid && isEditableColumn(column.prop)) {
                    updateMapping(row[fields.rowId], column.prop, '');
                    return true;
                }
            }
        } catch (error) {
            console.error('Error clearing cell:', error);
        }

        return false;
    }, [gridRef, translateRangeCoordinates, getFlatColumns, getRowByIndex, staticColumns, isStandaloneGrid, isEditableColumn, fields, rowData, updateRowDataBatch, updateMappingsBatch, updateRowData, updateMapping]);

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

    // Handle paste region event - let RevoGrid handle the paste operation internally
    // We intercept the clipboardrangepaste event which provides proper coordinate information
    const handlePasteRegion = useCallback((event) => {
        console.log('[DataGrid] handlePasteRegion - letting RevoGrid handle paste internally:', event.detail);
        // RevoGrid's clipboard system will trigger the clipboardrangepaste event with proper coordinates
        // We don't need to manually handle paste here, just let it flow through RevoGrid's system
    }, []);

    // Handle clipboard range paste event - this is the proper RevoGrid paste event with coordinate information
    const handleClipboardRangePaste = useCallback((event) => {
        console.log('[DataGrid] handleClipboardRangePaste:', event.detail);
        
        const { data, range, models } = event.detail;
        if (!data || !range) {
            console.log('[DataGrid] No valid clipboard paste data');
            return;
        }
        
        try {
            // RevoGrid's data object already uses column props as keys (not colType-relative indexes)
            // so we don't need coordinate translation for the data processing
            // The range coordinates are for display/validation purposes
            const updates = [];
            const rowDataUpdates = [];
            
            console.log('[DataGrid] Processing clipboard data:', { 
                dataKeys: Object.keys(data),
                sampleRow: data[Object.keys(data)[0]]
            });
            
            // Process the data lookup structure from RevoGrid's clipboard system
            // data format: { rowIndex: { columnProp: value } }
            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);
                if (!row) {
                    console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }
                
                // Iterate through all column props in this row's data
                for (const [columnProp, value] of Object.entries(rowDataObj)) {
                    const stringValue = (value === undefined || value === null) ? '' : String(value);
                    const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
                    const staticColumn = staticColumns.find(col => col.prop === columnProp);
                    
                    // Skip readonly columns
                    if (staticColumn?.readonly) continue;
                    
                    if (isStaticColumn) {
                        rowDataUpdates.push({
                            rowId: row[fields.rowId],
                            columnProp: columnProp,
                            value: stringValue
                        });
                    } else if (isEditableColumn(columnProp)) {
                        updates.push({
                            rowId: row[fields.rowId],
                            columnId: columnProp,
                            value: stringValue
                        });
                    }
                }
            }
            
            // Apply all updates in batch
            if (rowDataUpdates.length > 0) {
                const rowUpdatesMap = new Map();
                rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
                    if (!rowUpdatesMap.has(rowId)) {
                        rowUpdatesMap.set(rowId, {});
                    }
                    rowUpdatesMap.get(rowId)[columnProp] = value;
                });

                const currentData = [...rowData.map(row => ({ ...row }))];
                rowUpdatesMap.forEach((columnUpdates, rowId) => {
                    const rowToUpdate = currentData.find(r => r[fields.rowId] === rowId);
                    if (rowToUpdate) {
                        Object.assign(rowToUpdate, columnUpdates);
                    }
                });

                updateRowDataBatch(currentData);
            }
            
            if (updates.length > 0) {
                updateMappingsBatch(updates);
            }
            
            console.log('[DataGrid] Clipboard paste operation completed:', {
                processedRows: Object.keys(data).length,
                rowUpdates: rowDataUpdates.length,
                mappingUpdates: updates.length
            });
            
        } catch (error) {
            console.error('[DataGrid] Error in clipboard paste operation:', error);
        }
    }, [staticColumns, isEditableColumn, getRowByIndex, updateMappingsBatch, updateRowDataBatch, rowData, fields]);

    // Handle clear region event - let the existing handleClearCell handle the logic
    const handleClearRegion = useCallback((event) => {
        console.log('[DataGrid] handleClearRegion - delegating to handleClearCell:', event.detail);
        // RevoGrid's clear region works by calling clearCell on selected ranges
        // Our existing handleClearCell already handles this with proper coordinate translation
        handleClearCell(event);
    }, [handleClearCell]);

    // Note: We don't handle beforeautofill - it fires BEFORE RevoGrid calculates the data
    // The data processing happens in handleAfterEdit which catches range edits from autofill

    // Action plugins (e.g. file-assign) are supported via the `actionPlugins` prop

    // directory assignment removed; no onDirChange handler

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

                        {/* File assign plugin (extracted) */}
                        <div className="border-l border-gray-300 h-6 mx-2"></div>
                                            {/* Debug button for selection */}
                        <button
                            onClick={async () => {
                                const grid = gridRef.current;
                                if (grid && typeof grid.getSelectedRange === 'function') {
                                    try {
                                        const selection = await grid.getSelectedRange();
                                        console.log('[DataGrid] Current selection:', selection);
                                        const flatCols = getFlatColumns();
                                        console.log('[DataGrid] Flat columns:', flatCols.map((c, i) => ({ index: i, prop: c.prop, pin: c.pin })));
                                    } catch (err) {
                                        console.error('[DataGrid] Error getting selection:', err);
                                    }
                                }
                            }}
                            className="px-3 py-1 text-sm rounded border bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                            title="Debug selection"
                        >
                            🔍 Debug Selection
                        </button>

                        {/* Render action plugin*/}
                                            {(actionPlugins && actionPlugins.length > 0) && actionPlugins.map((P, idx) => {
                                                const pluginApi = { gridRef, getFlatColumns, hookRowData, fields, updateMappingsBatch, showDebug };
                                                // If item is a valid React element, clone it with props
                                                if (React.isValidElement(P)) {
                                                    return React.cloneElement(P, { key: `plugin-${idx}`, api: pluginApi });
                                                }
                                                // If it's a component (function/class), instantiate it
                                                if (typeof P === 'function') {
                                                    const PluginComp = P;
                                                    return <PluginComp key={`plugin-${idx}`} api={pluginApi} />;
                                                }
                                                // If it's something else (e.g., null), skip
                                                return null;
                                            })}
                    </div>
                )}
            </div>

            {/* Grid */}
            <RevoGrid
                key={gridKey}
                ref={setGridRef}
                style={{ height }}
                source={gridData}
                rowSize={rowsize}
                columns={appliedColumns}
                onBeforeedit={handleBeforeEdit}
                onAfteredit={handleAfterEdit}
                onBeforerangeedit={handleBeforeRangeEdit}
                onAfterangeedit={handleAfterRangeEdit}
                // Handle copy/paste/clear/autofill events with coordinate translation
                onBeforecopy={(e) => console.log('[DataGrid] beforecopy:', e.detail)}
                onBeforepaste={(e) => {
                    console.log('[DataGrid] beforepaste:', e.detail);
                    // Note: beforepaste doesn't seem to have range info, actual paste is in pasteregion
                }}
                onBeforecut={(e) => console.log('[DataGrid] beforecut:', e.detail)}
                onCopyregion={(e) => console.log('[DataGrid] copyregion:', e.detail)}
                onPasteregion={(e) => {
                    console.log('[DataGrid] pasteregion:', e.detail);
                    handlePasteRegion(e);
                }}
                onClearregion={(e) => {
                    console.log('[DataGrid] clearregion:', e.detail);
                    handleClearRegion(e);
                }}
                onClipboardrangepaste={(e) => {
                    console.log('[DataGrid] clipboardrangepaste:', e.detail);
                    handleClipboardRangePaste(e);
                }}
                onBeforeautofill={(e) => {
                    // Log for debugging - RevoGrid will handle autofill internally
                    // Our handleAfterEdit will catch the resulting range edit
                    console.log('[DataGrid] beforeautofill (letting RevoGrid handle):', e.detail);
                }}
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

            {/* Action plugins are responsible for any hidden inputs / DOM they need */}

            {/* Directory picker removed temporarily */}
            {/* debug UI removed to keep component lean — use console.debug for logs */}
        </div>
    );
});

export default DataGrid;
