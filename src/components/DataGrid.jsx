import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import applyFilesToRange from './dataGridUtils';
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

    // Expose currentMappings count for debug UI
    const currentMappingsCount = (currentMappings || []).length;

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
    const [gridElement, setGridElement] = useState(null);

    const setGridRef = (node) => {
        if (!node) {
            gridRef.current = null;
            setGridElement(null);
            return;
        }
        // If the React wrapper forwards the webcomponent under .element or .el, prefer that
        if (node instanceof HTMLElement && node.tagName?.toLowerCase() === 'revo-grid') {
            gridRef.current = node;
            setGridElement(node);
        } else if (node.element instanceof HTMLElement) {
            gridRef.current = node.element;
            setGridElement(node.element);
        } else if (node.el instanceof HTMLElement) {
            gridRef.current = node.el;
            setGridElement(node.el);
        } else {
            // fallback to whatever was provided
            gridRef.current = node;
            setGridElement(node);
        }
    };
    // Refs for file inputs and selection snapshot
    const fileInputRef = useRef();
    const dirInputRef = useRef();
    const selectionSnapshotRef = useRef(null);
    // Ref to store FileList or array temporarily without putting in state
    const filesRef = useRef(null);
    // Key to force RevoGrid remount when necessary
    const [gridKey, setGridKey] = useState(0);
    // Debug UI state
    const [lastSnapshot, setLastSnapshot] = useState(null);
    const [lastFileCount, setLastFileCount] = useState(0);
    const [lastMappings, setLastMappings] = useState([]);
    const [lastUpdates, setLastUpdates] = useState([]);
    const [lastDebugInfo, setLastDebugInfo] = useState(null);
    const [terminalLogs, setTerminalLogs] = useState([]);

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

    // Selection snapshotting: capture selection when RevoGrid fires selection events
    useEffect(() => {
        // Attach listeners after the gridElement is set so we reliably listen on the
        // real webcomponent (which may be forwarded by the React wrapper)
        const el = gridElement || document.querySelector('revo-grid');
        if (!el) return;

        const logToTerminal = (msg, obj) => {
            try {
                const s = obj ? `${msg} ${JSON.stringify(obj, (k, v) => (typeof v === 'function' ? String(v) : v), 2)}` : msg;
                setTerminalLogs(prev => [...prev.slice(-200), s]);
            } catch (err) {
                setTerminalLogs(prev => [...prev.slice(-200), msg]);
            }
        };

        const awaitMaybe = async (v) => (v && typeof v.then === 'function') ? await v : v;

        const normalizeRange = (r) => {
            if (!r || typeof r !== 'object') return null;
            // Common shape: { x, y, x1, y1 }
            if (typeof r.x === 'number' && typeof r.y === 'number') return { x: r.x, y: r.y, x1: (typeof r.x1 === 'number' ? r.x1 : r.x), y1: (typeof r.y1 === 'number' ? r.y1 : r.y) };
            // Alternate shapes we may encounter (try to map)
            if (typeof r.left === 'number' && typeof r.top === 'number') return { x: r.left, y: r.top, x1: r.right || r.left, y1: r.bottom || r.top };
            if (typeof r.startX === 'number' && typeof r.startY === 'number') return { x: r.startX, y: r.startY, x1: r.endX || r.startX, y1: r.endY || r.startY };
            // Fallback: find numeric properties
            const nums = Object.keys(r).filter(k => typeof r[k] === 'number');
            if (nums.length >= 4) {
                const values = nums.slice(0,4).map(k => r[k]);
                return { x: values[0], y: values[1], x1: values[2], y1: values[3] };
            }
            return null;
        };
        const handleSelection = async (ev) => {
            try {
                const d = ev?.detail || {};
                logToTerminal(`[DataGrid] selection event: ${ev.type}`, d);

                // prefer explicit range props in event.detail
                const raw = d?.newRange || d?.range || d?.selection || d;
                let norm = normalizeRange(raw);

                // if event didn't include it, try component API synchronously
                if (!norm && el && typeof el.getSelectedRange === 'function') {
                    try {
                        const maybe = await awaitMaybe(el.getSelectedRange());
                        if (maybe && typeof maybe === 'object' && typeof maybe.x === 'number') {
                            norm = normalizeRange(maybe) || maybe;
                            logToTerminal('[DataGrid] getSelectedRange result', norm);
                        }
                    } catch (err) {
                        // ignore
                    }
                }

                if (norm) {
                    selectionSnapshotRef.current = { range: norm };
                    setLastSnapshot({ range: norm });
                }
            } catch (err) {
                // ignore
            }
        };

        const eventNames = ['selectionchange', 'rangeselect', 'rangechange', 'beforerange', 'afterfocus', 'aftergridrender', 'aftergridrender'];
        eventNames.forEach(n => el.addEventListener(n, handleSelection));

        // Also listen for pointerup on document to capture mouse selection end if grid events are not fired
        const onPointerUp = async (ev) => {
            try {
                // quick attempt to capture
                if (el && typeof el.getSelectedRange === 'function') {
                    const maybe = await awaitMaybe(el.getSelectedRange());
                    if (maybe && typeof maybe === 'object' && typeof maybe.x === 'number') {
                        const nr = normalizeRange(maybe) || maybe;
                        selectionSnapshotRef.current = { range: nr };
                        setLastSnapshot({ range: nr });
                        logToTerminal('[DataGrid] pointerup captured range', nr);
                    }
                }
            } catch (err) {
                // ignore
            }
        };
        document.addEventListener('pointerup', onPointerUp);

        return () => {
            eventNames.forEach(n => el.removeEventListener(n, handleSelection));
            document.removeEventListener('pointerup', onPointerUp);
        };
    }, [gridElement]);

    // DOM capture fallback: if selectionSnapshotRef is empty, capture focused/selected cells
    const captureSelectionFromDOM = useCallback(async () => {
        const el = gridElement || gridRef.current || document.querySelector('revo-grid');
        if (!el) return null;

        const normalizeRange = (r) => {
            if (!r || typeof r !== 'object') return null;
            if (typeof r.x === 'number' && typeof r.y === 'number') return { x: r.x, y: r.y, x1: (typeof r.x1 === 'number' ? r.x1 : r.x), y1: (typeof r.y1 === 'number' ? r.y1 : r.y) };
            if (typeof r.left === 'number' && typeof r.top === 'number') return { x: r.left, y: r.top, x1: r.right || r.left, y1: r.bottom || r.top };
            return null;
        };

        // Try component API (may return object or promise)
        try {
            if (typeof el.getSelectedRange === 'function') {
                const maybe = await awaitMaybe(el.getSelectedRange());
                if (maybe && typeof maybe === 'object' && typeof maybe.x === 'number') {
                    const r = normalizeRange(maybe) || maybe;
                    const snapshot = { range: r, source: 'api' };
                    selectionSnapshotRef.current = snapshot;
                    setLastSnapshot(snapshot);
                    setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] captureSelectionFromDOM api -> ${JSON.stringify(r)}`]);
                    return r;
                }
            }
        } catch (err) {
            // ignore synchronous or async API failures — we'll continue to DOM introspection
        }

        // Inspect shadowRoot if present
        const root = (el.shadowRoot && el.shadowRoot.querySelector) ? el.shadowRoot : el;

        // Try to inspect overlay/temp-range elements which may store selection bounds
        try {
            const overlays = Array.from(root.querySelectorAll('revogr-overlay-selection, revogr-temp-range'));
            for (const ov of overlays) {
                // some overlay elements may have properties or attributes describing range
                const attrs = {};
                try {
                    for (const a of ov.getAttributeNames ? ov.getAttributeNames() : []) {
                        attrs[a] = ov.getAttribute(a);
                    }
                } catch (e) {
                    // ignore
                }
                // try to parse common attributes
                if (attrs['data-range'] || attrs['range']) {
                    try {
                        const parsed = JSON.parse(attrs['data-range'] || attrs['range']);
                        const nr = normalizeRange(parsed) || parsed;
                        const snapshot = { range: nr, source: 'overlay-attr' };
                        selectionSnapshotRef.current = snapshot;
                        setLastSnapshot(snapshot);
                        setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] captureSelectionFromDOM overlay attr -> ${JSON.stringify(nr)}`]);
                        return nr;
                    } catch (e) {
                        // not JSON — ignore
                    }
                }
                // try to read properties if available
                    try {
                        if (ov.selection && (ov.selection.x !== undefined)) {
                            const nr = normalizeRange(ov.selection) || ov.selection;
                            const snapshot = { range: nr, source: 'overlay-prop' };
                            selectionSnapshotRef.current = snapshot;
                            setLastSnapshot(snapshot);
                            setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] captureSelectionFromDOM overlay prop -> ${JSON.stringify(nr)}`]);
                            return nr;
                        }
                        // support properties that might be promises or getters
                        if (typeof ov.getSelectedRange === 'function') {
                            const maybe2 = await awaitMaybe(ov.getSelectedRange());
                            if (maybe2 && typeof maybe2.x === 'number') {
                                const nr2 = normalizeRange(maybe2) || maybe2;
                                const snapshot = { range: nr2, source: 'overlay-api' };
                                selectionSnapshotRef.current = snapshot;
                                setLastSnapshot(snapshot);
                                setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] captureSelectionFromDOM overlay api -> ${JSON.stringify(nr2)}`]);
                                return nr2;
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
            }
        } catch (err) {
            // ignore overlay parsing errors
        }

        // As a last resort, try to find cells marked selected/focused and compute bounds
        try {
            const allCells = Array.from(root.querySelectorAll('[data-rgrow][data-rgcol]'));
            const selectedByClass = allCells.filter(n => (n.className || '').includes('selected') || (n.getAttribute && n.getAttribute('aria-selected') === 'true'));
            const focusedByClass = allCells.filter(n => (n.className || '').includes('focused') || n.getAttribute('tabindex') === '0');
            const sample = selectedByClass.length ? selectedByClass : (focusedByClass.length ? focusedByClass : allCells.slice(0,1));
            if (!sample || sample.length === 0) return null;
            const first = sample[0];
            const rgRow = parseInt(first.getAttribute('data-rgrow') || '0', 10);
            const rgCol = parseInt(first.getAttribute('data-rgcol') || '0', 10);
            let minRow = rgRow, maxRow = rgRow, minCol = rgCol, maxCol = rgCol;
            sample.forEach(node => {
                const r = parseInt(node.getAttribute('data-rgrow') || '0', 10);
                const c = parseInt(node.getAttribute('data-rgcol') || '0', 10);
                if (r < minRow) minRow = r;
                if (r > maxRow) maxRow = r;
                if (c < minCol) minCol = c;
                if (c > maxCol) maxCol = c;
            });
            const range = { x: minCol, y: minRow, x1: maxCol, y1: maxRow };
            const snapshot = { range, source: 'dom-capture', foundCells: sample.length };
            setLastSnapshot(snapshot);
            try {
                const rect = first.getBoundingClientRect();
                setLastDebugInfo({ rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, nodeName: first.nodeName, className: first.className });
            } catch (err) {
                setLastDebugInfo({ error: String(err) });
            }
            setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] captureSelectionFromDOM -> ${JSON.stringify(snapshot)}`]);
            return range;
        } catch (err) {
            return null;
        }
    }, [gridElement]);

    const dumpGridDom = useCallback(() => {
        const el = gridElement || gridRef.current || document.querySelector('revo-grid');
        if (!el) {
            setLastDebugInfo({ error: 'no grid element found' });
            return;
        }

        try {
            const root = (el.shadowRoot && el.shadowRoot.querySelector) ? el.shadowRoot : el;
            const allCells = Array.from(root.querySelectorAll('[data-rgrow][data-rgcol]'));
            const selected = allCells.filter(n => (n.className || '').includes('selected') || n.getAttribute('aria-selected') === 'true');
            const focused = allCells.filter(n => (n.className || '').includes('focused'));
            const sample = allCells.slice(0, 5).map(n => ({ r: n.getAttribute('data-rgrow'), c: n.getAttribute('data-rgcol'), cls: n.className }));
            const info = {
                hasShadowRoot: !!el.shadowRoot,
                totalCells: allCells.length,
                selectedCount: selected.length,
                focusedCount: focused.length,
                sampleCells: sample
            };
            setLastDebugInfo(info);
            setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] dumpGridDom -> ${JSON.stringify(info)}`]);
        } catch (err) {
            setLastDebugInfo({ error: String(err) });
        }
    }, [gridElement]);

    // Deep inspection helper for debugging selection issues
    const deepInspectGrid = useCallback(async () => {
        const el = gridElement || gridRef.current || document.querySelector('revo-grid');
        if (!el) {
            const msg = '[DataGrid] deepInspectGrid -> no grid element found';
            setTerminalLogs(prev => [...prev.slice(-200), msg]);
            setLastDebugInfo({ error: 'no grid element found' });
            return;
        }

        const push = (s) => setTerminalLogs(prev => [...prev.slice(-200), s]);

        push('[DataGrid] deepInspectGrid -> starting');

        // Helper to await either value or promise
        const awaitMaybe = async (v) => (v && typeof v.then === 'function') ? await v : v;

        try {
            // 1) API: getSelectedRange
            try {
                const maybeRange = awaitMaybe(el.getSelectedRange && el.getSelectedRange());
                push(`[DataGrid] API getSelectedRange -> ${JSON.stringify(maybeRange)}`);
            } catch (e) {
                push(`[DataGrid] API getSelectedRange threw: ${String(e)}`);
            }

            // 2) API: getFocused
            try {
                const focused = awaitMaybe(el.getFocused && el.getFocused());
                push(`[DataGrid] API getFocused -> ${JSON.stringify(focused && (typeof focused === 'object' ? { cell: focused.cell, colType: focused.colType, rowType: focused.rowType } : focused))}`);
            } catch (e) {
                push(`[DataGrid] API getFocused threw: ${String(e)}`);
            }

            // 3) Search inside shadowRoot or element for revogr-* elements and log small snapshots
            const root = (el.shadowRoot && el.shadowRoot.querySelector) ? el.shadowRoot : el;
            push(`[DataGrid] deepInspectGrid -> hasShadowRoot=${!!el.shadowRoot}`);

            const interesting = Array.from(root.querySelectorAll('revogr-overlay-selection, revogr-temp-range, revogr-focus, revogr-data, revogr-viewport-scroll, revogr-header'));
            push(`[DataGrid] deepInspectGrid -> found ${interesting.length} revogr-* nodes`);

            const nodeSummaries = interesting.slice(0,50).map(n => {
                const attrs = {};
                try { (n.getAttributeNames ? n.getAttributeNames() : []).forEach(a => { attrs[a] = n.getAttribute(a); }); } catch (e) {}
                const props = {};
                // Check for some known property names
                ['selection','range','tempArea','selectionStore','rowSelectionStore','selectionStoreConnector'].forEach(p => {
                    try { if (p in n) props[p] = (typeof n[p] === 'object' ? JSON.stringify(n[p], (k,v)=> typeof v === 'function' ? String(v) : v, 2) : String(n[p])); } catch(e) {}
                });
                return { tag: n.tagName, attrs, props };
            });
            push(`[DataGrid] deepInspectGrid nodes: ${JSON.stringify(nodeSummaries.slice(0,10), null, 2)}`);

            // 4) Count cells in shadow root and sample attributes
            try {
                const allCells = Array.from(root.querySelectorAll('[data-rgrow],[data-rgcol]')).slice(0,500);
                const sample = allCells.slice(0,20).map(n => ({ tag: n.tagName, r: n.getAttribute && n.getAttribute('data-rgrow'), c: n.getAttribute && n.getAttribute('data-rgcol'), cls: n.className }));
                push(`[DataGrid] deepInspectGrid cells sample (${sample.length}): ${JSON.stringify(sample, null, 2)}`);
            } catch (e) {
                push(`[DataGrid] deepInspectGrid cells scan error: ${String(e)}`);
            }

            // 5) Log selectionSnapshotRef and lastSnapshot
            push(`[DataGrid] deepInspectGrid selectionSnapshotRef -> ${JSON.stringify(selectionSnapshotRef.current)}`);
            push(`[DataGrid] deepInspectGrid lastSnapshot -> ${JSON.stringify(lastSnapshot)}`);

            setLastDebugInfo({ deepInspect: true, timestamp: Date.now() });
            push('[DataGrid] deepInspectGrid -> finished');
        } catch (err) {
            push(`[DataGrid] deepInspectGrid error: ${String(err)}`);
        }
    }, [gridElement, lastSnapshot]);

    // Public: open file picker for assigning files to current selection
    const openFilePickerForSelection = useCallback(async (directory = false) => {
        // Snapshot current selection first (some browsers blur on file input open)
        let range = selectionSnapshotRef.current?.range;
        if (!range) {
            // Try component API first (may be sync or Promise)
            try {
                const gridEl = gridRef.current || document.querySelector('revo-grid');
                if (gridEl && gridEl.getSelectedRange) {
                    const maybe = gridEl.getSelectedRange();
                    if (maybe && typeof maybe.then === 'function') {
                        // await promise
                        const awaited = await maybe;
                        if (awaited && typeof awaited.x === 'number') {
                            range = awaited;
                        }
                    } else if (maybe && typeof maybe.x === 'number') {
                        range = maybe;
                    }
                }
            } catch (err) {
                // ignore
            }

            if (!range) {
                range = captureSelectionFromDOM();
            }

            if (range) selectionSnapshotRef.current = { range };
        }

        if (!selectionSnapshotRef.current?.range) {
            // nothing to assign
            return;
        }

        filesRef.current = null;

        if (directory && dirInputRef.current) {
            dirInputRef.current.value = null;
            dirInputRef.current.click();
            return;
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = null;
            fileInputRef.current.click();
        }
    }, [captureSelectionFromDOM]);

    const handleFilesPicked = useCallback((fileList) => {
        filesRef.current = fileList;
        const snapshot = selectionSnapshotRef.current;
        if (!snapshot || !snapshot.range) {
            // No selection snapshot — try a best-effort fallback using focused cell or API
            const msg = '[DataGrid] No selection snapshot at file pick; attempting focused-cell fallback';
            // eslint-disable-next-line no-console
            console.log(msg);
            setTerminalLogs(prev => [...prev.slice(-200), msg]);

            // Try component API first
            try {
                const el = gridElement || gridRef.current || document.querySelector('revo-grid');
                let focused = null;
                if (el && typeof el.getFocused === 'function') {
                    try {
                        const maybe = el.getFocused();
                        focused = maybe && typeof maybe === 'object' ? maybe : null;
                    } catch (e) {
                        // ignore sync errors
                    }
                }

                // If API didn't yield a focused cell, find a focused/selected cell in DOM
                if (!focused) {
                    const root = (el && el.shadowRoot && el.shadowRoot.querySelector) ? el.shadowRoot : (el || document);
                    const focusedNode = root.querySelector && (root.querySelector('[data-rgrow][data-rgcol].focused') || root.querySelector('[data-rgrow][data-rgcol][tabindex="0"]') || root.querySelector('[data-rgrow][data-rgcol]'));
                    if (focusedNode) {
                        focused = { cell: { x: parseInt(focusedNode.getAttribute('data-rgcol') || '0', 10), y: parseInt(focusedNode.getAttribute('data-rgrow') || '0', 10) } };
                    }
                }

                // If we found a focused cell, compute a fallback range big enough for files
                if (focused && focused.cell) {
                    const startCol = focused.cell.x || 0;
                    const startRow = focused.cell.y || 0;
                    const totalFiles = fileList ? (fileList.length || Object.keys(fileList).length || 0) : 0;
                    const totalCols = appliedColumns ? appliedColumns.length : 0;
                    const totalRows = hookRowData ? hookRowData.length : 0;

                    const computeFallbackRangeFromFocus = (sRow, sCol, count, rowsCount, colsCount) => {
                        if (count <= 0) return null;
                        if (!colsCount || colsCount <= 0) colsCount = 1;
                        if (!rowsCount || rowsCount <= 0) rowsCount = 1;
                        let remaining = count;
                        let curRow = sRow;
                        let curCol = sCol;
                        let minRow = sRow, maxRow = sRow, minCol = sCol, maxCol = sCol;
                        while (remaining > 1) {
                            // move to next cell in row-major order
                            curCol++;
                            if (curCol >= colsCount) {
                                curCol = 0;
                                curRow++;
                                if (curRow >= rowsCount) break; // no more space
                            }
                            if (curRow < minRow) minRow = curRow;
                            if (curRow > maxRow) maxRow = curRow;
                            if (curCol < minCol) minCol = curCol;
                            if (curCol > maxCol) maxCol = curCol;
                            remaining--;
                        }
                        return { x: minCol, y: minRow, x1: maxCol, y1: maxRow };
                    };

                    const fallbackRange = computeFallbackRangeFromFocus(startRow, startCol, totalFiles, totalRows, totalCols);
                    if (fallbackRange) {
                        selectionSnapshotRef.current = { range: fallbackRange, source: 'fallback-focused' };
                        setLastSnapshot({ range: fallbackRange, source: 'fallback-focused' });
                        setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] fallback range computed ${JSON.stringify(fallbackRange)}`]);
                    } else {
                        setTerminalLogs(prev => [...prev.slice(-200), '[DataGrid] fallback range could not be computed (grid too small)']);
                    }
                } else {
                    setTerminalLogs(prev => [...prev.slice(-200), '[DataGrid] no focused cell found for fallback']);
                }
            } catch (e) {
                setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] fallback error: ${String(e)}`]);
            }

            // Refresh snapshot variable for rest of function
            // eslint-disable-next-line no-param-reassign
            // snapshot = selectionSnapshotRef.current; // cannot reassign const — read below via selectionSnapshotRef
        }

        const snapshotNow = selectionSnapshotRef.current;
        if (!snapshotNow || !snapshotNow.range) {
            const msg2 = '[DataGrid] Files picked but still no selection snapshot available after fallback';
            // eslint-disable-next-line no-console
            console.log(msg2);
            setTerminalLogs(prev => [...prev.slice(-200), msg2]);
            return;
        }

        // Log snapshot and basic file info to console and in-page terminal logs
        try {
            const filesArr = Array.prototype.slice.call(fileList || []);
            const names = filesArr.map(f => ({ name: f.name, webkitRelativePath: f.webkitRelativePath || '' }));
            const infoMsg = `[DataGrid] handleFilesPicked snapshot=${JSON.stringify(snapshot.range)} files=${JSON.stringify(names.slice(0,20))}`;
            // eslint-disable-next-line no-console
            console.log(infoMsg);
            setTerminalLogs(prev => [...prev.slice(-200), infoMsg]);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[DataGrid] error serializing file list', err);
        }

        // Build flatCols for child column support: create flattened list from appliedColumns
        const flatColumnDefs = [];
        appliedColumns.forEach(col => {
            if (col.children) col.children.forEach(ch => flatColumnDefs.push(ch));
            else flatColumnDefs.push(col);
        });

        // Ensure rows passed to the pure util have an `id` field corresponding to the
        // hook's configured row id (fields.rowId). This avoids mismatch when the
        // project's row id property is not literally `id`.
        const rowsForUtil = hookRowData.map((r, idx) => ({ ...r, id: r[fields.rowId] ?? idx }));

    const effectiveRange = selectionSnapshotRef.current.range;
    const mappings = applyFilesToRange(effectiveRange, rowsForUtil, flatColumnDefs, fileList);

        if (mappings.length > 0) {
            // Debug: show the mappings computed before applying
            // eslint-disable-next-line no-console
            console.log('[DataGrid] applying mappings', mappings.slice(0, 200));
            setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] applying mappings (${mappings.length})`]);
            setLastMappings(mappings.slice(0, 200));

            // map to updateMappingsBatch expected shape: { rowId, columnId, value }
            const updates = mappings.map(m => ({ rowId: m.mappingRowId, columnId: m.mappingColumnId, value: m.mappingValue }));
            // Debug: show the updates passed into updateMappingsBatch
            // eslint-disable-next-line no-console
            console.log('[DataGrid] updateMappingsBatch updates=', updates.slice(0, 200));
            setTerminalLogs(prev => [...prev.slice(-200), `[DataGrid] updateMappingsBatch updates (${updates.length})`]);
            setLastUpdates(updates.slice(0,200));
            updateMappingsBatch(updates);

            // Delay remount slightly so React can commit mapping state (setState in hook)
            // before we force the grid to remount. This prevents the webcomponent from
            // reinitializing with stale props.
            setTimeout(() => {
                setGridKey(k => k + 1);
                // Also refresh appliedColumns identity to be safe
                setAppliedColumns(prev => prev.map(c => ({ ...c })));
            }, 0);
        }

        setLastFileCount(fileList ? (fileList.length || fileList.length === 0 ? fileList.length : Object.keys(fileList).length) : 0);
        // Clear snapshot after applying
        selectionSnapshotRef.current = null;
        filesRef.current = null;
    }, [appliedColumns, hookRowData, updateMappingsBatch]);

    // Handlers for native file inputs
    const onFilesChange = useCallback((ev) => {
        const files = ev.target.files;
        handleFilesPicked(files);
    }, [handleFilesPicked]);

    const onDirChange = useCallback((ev) => {
        const files = ev.target.files;
        // Note: for directory selection we might get many files; use same handler but do not store FileList in state
        handleFilesPicked(files);
    }, [handleFilesPicked]);

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

                        {/* File assign controls */}
                        <div className="border-l border-gray-300 h-6 mx-2"></div>
                        <button
                            type="button"
                            onMouseDown={async (e) => {
                                // Prevent the button from taking focus so the grid selection doesn't blur
                                e.preventDefault();
                                try {
                                    const snap = await captureSelectionFromDOM();
                                    if (snap) selectionSnapshotRef.current = { range: snap };
                                } catch (err) {
                                    // ignore
                                }
                                // open file picker immediately while grid still has focus
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = null;
                                    fileInputRef.current.click();
                                }
                            }}
                            className={`px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100`}
                            title="Assign files to current selection"
                        >
                            📁 Assign files
                        </button>
                        <button
                            type="button"
                            onMouseDown={async (e) => {
                                e.preventDefault();
                                try {
                                    const snap = await captureSelectionFromDOM();
                                    if (snap) selectionSnapshotRef.current = { range: snap };
                                } catch (err) {
                                    // ignore
                                }
                                if (dirInputRef.current) {
                                    dirInputRef.current.value = null;
                                    dirInputRef.current.click();
                                }
                            }}
                            className={`px-3 py-1 text-sm rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100`}
                            title="Assign directory to current selection"
                        >
                            📂 Assign directory
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                // Keep focus, but clear any pending snapshot
                                selectionSnapshotRef.current = null;
                                filesRef.current = null;
                            }}
                            className={`px-3 py-1 text-sm rounded border bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100`}
                            title="Cancel assignment"
                        >
                            ✖ Cancel
                        </button>
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

            {/* Hidden file inputs used to open native file pickers without storing FileList in state */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFilesChange}
                style={{ display: 'none' }}
                aria-hidden
            />

            {/* Directory picker: webkitdirectory is non-standard but widely supported; degrade gracefully */}
            <input
                ref={dirInputRef}
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={onDirChange}
                style={{ display: 'none' }}
                aria-hidden
            />

            {/* Debug View */}
            {showDebug && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Debug: Current Data</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium mb-2">Last Selection Snapshot</h4>
                            <div className="max-h-36 overflow-y-auto bg-white p-3 rounded border">
                                <pre className="text-xs">{JSON.stringify(lastSnapshot, null, 2)}</pre>
                            </div>
                            <div className="mt-2 text-sm">Current mappings (hook): {String(currentMappingsCount)}</div>
                            <div className="mt-2">
                                <button className="px-2 py-1 text-xs rounded border bg-blue-50" onMouseDown={async (e) => {
                                    e.preventDefault();
                                    // Apply a single synthetic mapping to the first visible cell so we can see if updates propagate.
                                    try {
                                        const flatColumnDefs = [];
                                        stableColumnDefs.current.forEach(col => {
                                            if (col.children) col.children.forEach(ch => flatColumnDefs.push(ch));
                                            else flatColumnDefs.push(col);
                                        });
                                        const firstRow = hookRowData && hookRowData[0];
                                        const firstCol = flatColumnDefs && flatColumnDefs[0];
                                        if (!firstRow || !firstCol) return;
                                        const updates = [{ rowId: firstRow[fields.rowId], columnId: firstCol.prop, value: 'TEST-MAPPING' }];
                                        // show it in the debug UI
                                        setLastUpdates(updates);
                                        // eslint-disable-next-line no-console
                                        console.log('[DataGrid] debug apply updates', updates);
                                        updateMappingsBatch(updates);
                                        // force remount
                                        setTimeout(() => setGridKey(k => k + 1), 0);
                                    } catch (err) {
                                        // eslint-disable-next-line no-console
                                        console.error('debug mapping apply failed', err);
                                    }
                                }}>Apply test mapping</button>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    className="px-2 py-1 text-xs rounded border bg-blue-50"
                                    onMouseDown={(e) => {
                                        // Prevent the button from taking focus so the grid selection doesn't blur
                                        e.preventDefault();
                                        const snap = captureSelectionFromDOM();
                                        if (snap) selectionSnapshotRef.current = { range: snap };
                                    }}
                                >Capture now</button>
                                <button
                                    className="px-2 py-1 text-xs rounded border bg-blue-50"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        dumpGridDom();
                                    }}
                                >Dump grid DOM</button>
                            </div>
                            <h4 className="font-medium mt-3 mb-2">Last File Count</h4>
                            <div className="bg-white p-2 rounded border text-sm">{String(lastFileCount)}</div>
                            <div className="mt-2 bg-white p-2 rounded border text-sm">Debug Info: <pre className="text-xs">{JSON.stringify(lastDebugInfo, null, 2)}</pre></div>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Last Mappings (preview)</h4>
                            <div className="max-h-48 overflow-y-auto bg-white p-3 rounded border">
                                <pre className="text-xs">{JSON.stringify(lastMappings.slice(0,50), null, 2)}</pre>
                            </div>
                            <h4 className="font-medium mt-3 mb-2">Last Updates (preview)</h4>
                            <div className="max-h-48 overflow-y-auto bg-white p-3 rounded border">
                                <pre className="text-xs">{JSON.stringify(lastUpdates.slice(0,50), null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-medium mb-2">Terminal logs (latest)</h4>
                        <div className="max-h-40 overflow-y-auto bg-black text-white p-3 rounded">
                            <pre className="text-xs">{terminalLogs.slice(-200).join('\n')}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default DataGrid;
