import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle, useMemo, isValidElement, cloneElement } from 'react';
import Heading2 from '../Typography/Heading2';
import { RevoGrid } from '@revolist/react-datagrid';
import { useDataGrid } from '../../hooks/useDataGrid';
import "./DataGrid.css";
import TooltipButton from '../Widgets/TooltipButton';

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
    height = '45vh',        // Grid height (total container height, defaults to 45vh to match EntityMappingPanel)
    title = 'Data Grid',    // Grid title
    showControls = true,    // Show undo/redo controls
    showDebug = false,      // Show debug information
    rowsize = 50,           // Row height in pixels
    isActive = true,        // Whether this grid is active (should respond to global undo/redo)
    historyScopeKey,        // Optional history context key (resets undo/redo when key changes)

    // Event handlers
    onDataChange,           // Callback when mapping data changes
    onRowDataChange,        // Callback when row data changes (standalone mode)

    // Custom actions for controls
    customActions = [],     // Array of custom action buttons to add to controls
    hideClearAllMappings = false, // Optional: hide clear-all control (useful for standalone grids)

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
        applyTransaction,
        isEditableColumn,
        getRowByIndex,
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
        onRowDataChange, // Pass the callback to the hook
        historyScopeKey
    });

    // Debug flag helper - when false all debug logging in this component is suppressed
    const DBG = !!showDebug;

    const extractCellValue = useCallback((value) => {
        if (!value || typeof value !== 'object') return value;

        if (Object.prototype.hasOwnProperty.call(value, 'value')) {
            const candidate = value.value;
            if (candidate === null || candidate === undefined) return '';
            if (['string', 'number', 'boolean'].includes(typeof candidate)) return candidate;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'id')) {
            const candidate = value.id;
            if (candidate === null || candidate === undefined) return '';
            if (['string', 'number', 'boolean'].includes(typeof candidate)) return candidate;
        }

        return value;
    }, []);

    const scrubControlChars = useCallback((input) => {
        let hadControlChars = false;
        let output = '';
        let previousWasSpace = false;

        for (const ch of input) {
            const code = ch.charCodeAt(0);
            const isControl = code <= 31 || code === 127;
            if (isControl) {
                hadControlChars = true;
                if (!previousWasSpace) {
                    output += ' ';
                    previousWasSpace = true;
                }
                continue;
            }

            output += ch;
            previousWasSpace = false;
        }

        return hadControlChars ? output.replace(/\s+/g, ' ').trim() : input;
    }, []);

    // Clean clipboard/paste artifacts (Excel adds control chars) before storing values
    const normalizeCellValue = useCallback((value) => {
        const extractedValue = extractCellValue(value);
        if (extractedValue === undefined || extractedValue === null) return '';

        if (
            typeof extractedValue !== 'string' &&
            typeof extractedValue !== 'number' &&
            typeof extractedValue !== 'boolean'
        ) {
            return '';
        }

        const stringValue = String(extractedValue);
        return scrubControlChars(stringValue);
    }, [extractCellValue, scrubControlChars]);

    const parseChildMappingValue = useCallback((rawValue) => {
        if (Array.isArray(rawValue)) {
            return {
                specification: rawValue[0] ?? '',
                unit: rawValue[1] ?? ''
            };
        }
        if (typeof rawValue === 'string') {
            const [specification = '', unit = ''] = rawValue.split(';');
            return { specification, unit };
        }
        if (rawValue && typeof rawValue === 'object') {
            return {
                specification: rawValue.specification ?? '',
                unit: rawValue.unit ?? ''
            };
        }
        return { specification: '', unit: '' };
    }, []);

    const resolveEditValue = useCallback((detail, columnProp) => {
        if (!detail) return undefined;
        if (detail.val !== undefined) return detail.val;
        if (columnProp && detail.model && detail.model[columnProp] !== undefined) {
            // Select editors often write directly to model[prop]
            return detail.model[columnProp];
        }
        return detail.value;
    }, []);

    const applyRowUpdates = useCallback((baseRows, rowDataUpdates) => {
        if (!rowDataUpdates || rowDataUpdates.length === 0) return baseRows;

        const updatesByRowId = new Map();
        rowDataUpdates.forEach(({ rowId, columnProp, value }) => {
            if (!updatesByRowId.has(rowId)) {
                updatesByRowId.set(rowId, {});
            }
            updatesByRowId.get(rowId)[columnProp] = normalizeCellValue(value);
        });

        return (baseRows || []).map((row) => {
            const rowId = row[fields.rowId];
            const updates = updatesByRowId.get(rowId);
            if (!updates) return row;
            return { ...row, ...updates };
        });
    }, [fields.rowId, normalizeCellValue]);

    const applyMappingUpdates = useCallback((baseMappings, mappingUpdates) => {
        if (!mappingUpdates || mappingUpdates.length === 0) return baseMappings;

        const nextMappings = [...(baseMappings || [])];

        mappingUpdates.forEach(({ rowId, columnId, value }) => {
            const cleanedValue = normalizeCellValue(value);

            const isChildColumn = columnId.endsWith('_spec') || columnId.endsWith('_unit');
            const actualColumnId = isChildColumn
                ? columnId.replace(/_(spec|unit)$/, '')
                : columnId;

            const existingIndex = nextMappings.findIndex((mapping) =>
                mapping[fields.mappingRowId] === rowId &&
                mapping[fields.mappingColumnId] === actualColumnId
            );

            if (existingIndex >= 0) {
                const existing = nextMappings[existingIndex];

                if (isChildColumn && fields.hasChildColumns) {
                    const parsedValue = parseChildMappingValue(existing[fields.mappingValue]);
                    const nextValue = columnId.endsWith('_spec')
                        ? [cleanedValue, parsedValue.unit]
                        : [parsedValue.specification, cleanedValue];

                    nextMappings[existingIndex] = {
                        ...existing,
                        [fields.mappingValue]: nextValue
                    };
                } else {
                    nextMappings[existingIndex] = {
                        ...existing,
                        [fields.mappingValue]: cleanedValue
                    };
                }
                return;
            }

            const initialValue = (isChildColumn && fields.hasChildColumns)
                ? (columnId.endsWith('_spec') ? [cleanedValue, ''] : ['', cleanedValue])
                : cleanedValue;

            nextMappings.push({
                [fields.mappingRowId]: rowId,
                [fields.mappingColumnId]: actualColumnId,
                [fields.mappingValue]: initialValue
            });
        });

        return nextMappings;
    }, [
        normalizeCellValue,
        fields.mappingRowId,
        fields.mappingColumnId,
        fields.mappingValue,
        fields.hasChildColumns,
        parseChildMappingValue
    ]);

    const getNormalizedCurrentMappingValue = useCallback((baseMappings, rowId, columnId) => {
        const isChildColumn = columnId.endsWith('_spec') || columnId.endsWith('_unit');
        const actualColumnId = isChildColumn
            ? columnId.replace(/_(spec|unit)$/, '')
            : columnId;

        const existing = (baseMappings || []).find((mapping) =>
            mapping?.[fields.mappingRowId] === rowId &&
            mapping?.[fields.mappingColumnId] === actualColumnId
        );
        if (!existing) return '';

        if (isChildColumn && fields.hasChildColumns) {
            const parsed = parseChildMappingValue(existing[fields.mappingValue]);
            const rawValue = columnId.endsWith('_spec') ? parsed.specification : parsed.unit;
            return normalizeCellValue(rawValue);
        }

        return normalizeCellValue(existing[fields.mappingValue]);
    }, [
        fields.mappingRowId,
        fields.mappingColumnId,
        fields.mappingValue,
        fields.hasChildColumns,
        parseChildMappingValue,
        normalizeCellValue
    ]);

    const filterEffectiveRowUpdates = useCallback((updates, baseRows) => {
        if (!updates || updates.length === 0) return [];

        const rowLookup = new Map(
            (baseRows || []).map((row) => [row?.[fields.rowId], row])
        );
        const deduped = new Map();

        updates.forEach((update) => {
            if (!update?.rowId || !update?.columnProp) return;
            const key = `${update.rowId}::${update.columnProp}`;
            deduped.set(key, {
                rowId: update.rowId,
                columnProp: update.columnProp,
                value: normalizeCellValue(update.value)
            });
        });

        return Array.from(deduped.values()).filter((update) => {
            const row = rowLookup.get(update.rowId);
            const currentValue = normalizeCellValue(row?.[update.columnProp]);
            return currentValue !== update.value;
        });
    }, [fields.rowId, normalizeCellValue]);

    const filterEffectiveMappingUpdates = useCallback((updates, baseMappings) => {
        if (!updates || updates.length === 0) return [];

        const deduped = new Map();
        updates.forEach((update) => {
            if (!update?.rowId || !update?.columnId) return;
            const key = `${update.rowId}::${update.columnId}`;
            deduped.set(key, {
                rowId: update.rowId,
                columnId: update.columnId,
                value: normalizeCellValue(update.value)
            });
        });

        return Array.from(deduped.values()).filter((update) => {
            const currentValue = getNormalizedCurrentMappingValue(
                baseMappings,
                update.rowId,
                update.columnId
            );
            return currentValue !== update.value;
        });
    }, [getNormalizedCurrentMappingValue, normalizeCellValue]);

    const updateRowDataBatch = useCallback((newRowData, reason = 'row-batch') => {
        applyTransaction({
            nextRowData: newRowData || [],
            nextMappings: currentMappings,
            reason,
            notifyRowData: true
        });
    }, [applyTransaction, currentMappings]);

    const updateMappingsBatch = useCallback((updates, reason = 'mapping-batch') => {
        if (!updates || updates.length === 0) return;
        const nextMappings = applyMappingUpdates(currentMappings, updates);
        applyTransaction({
            nextRowData: hookRowData,
            nextMappings,
            reason,
            notifyRowData: false
        });
    }, [applyMappingUpdates, applyTransaction, currentMappings, hookRowData]);

    const commitGridChanges = useCallback(({
        rowDataUpdates = [],
        mappingUpdates = [],
        reason = 'grid-edit'
    }) => {
        const effectiveRowDataUpdates = filterEffectiveRowUpdates(rowDataUpdates, hookRowData);
        const effectiveMappingUpdates = filterEffectiveMappingUpdates(mappingUpdates, currentMappings);

        if (effectiveRowDataUpdates.length === 0 && effectiveMappingUpdates.length === 0) {
            return false;
        }

        const nextRows = effectiveRowDataUpdates.length > 0
            ? applyRowUpdates(hookRowData, effectiveRowDataUpdates)
            : hookRowData;

        const nextMappings = effectiveMappingUpdates.length > 0
            ? applyMappingUpdates(currentMappings, effectiveMappingUpdates)
            : currentMappings;

        applyTransaction({
            nextRowData: nextRows,
            nextMappings,
            reason,
            notifyRowData: effectiveRowDataUpdates.length > 0
        });

        return true;
    }, [
        filterEffectiveRowUpdates,
        filterEffectiveMappingUpdates,
        applyRowUpdates,
        hookRowData,
        applyMappingUpdates,
        currentMappings,
        applyTransaction
    ]);

    const handleClearAllMappings = useCallback(() => {
        if (!(stats && stats.totalMappings > 0)) return;
        const clearedMappings = (currentMappings || []).map((mapping) => ({
            ...mapping,
            [fields.mappingValue]: ''
        }));

        applyTransaction({
            nextRowData: hookRowData,
            nextMappings: clearedMappings,
            reason: 'clear-all-mappings',
            notifyRowData: false
        });
    }, [stats, currentMappings, fields.mappingValue, applyTransaction, hookRowData]);

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
    const editSessionRef = useRef(null);
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
    const [gridKey] = useState(0);

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

    // Handle wheel events on scrollable cells to prioritize cell scroll over grid scroll
    // This fixes the nested scroll issue where grid scroll captures wheel events before cells
    useEffect(() => {
        const gridElement = gridRef.current;
        if (!gridElement) return;

        // Track when we reach a boundary to add a delay before grid scrolling resumes
        let boundaryReachedTime = 0;
        const BOUNDARY_DELAY = 200; // milliseconds delay before allowing grid scroll

        const handleCellWheel = (e) => {
            // Find the closest cell element
            const cell = e.target.closest('.rgCell');
            if (!cell) return;

            // Check if the cell has scrollable content
            const isScrollable = cell.scrollHeight > cell.clientHeight;
            if (!isScrollable) return;

            const { scrollTop, scrollHeight, clientHeight } = cell;
            const atTop = scrollTop <= 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
            const scrollingDown = e.deltaY > 0;
            const scrollingUp = e.deltaY < 0;

            // Check if we're at a boundary
            const atBoundary = (scrollingDown && atBottom) || (scrollingUp && atTop);

            if (atBoundary) {
                const now = Date.now();
                
                // First time reaching boundary - start the timer
                if (boundaryReachedTime === 0) {
                    boundaryReachedTime = now;
                }
                
                const timeSinceBoundary = now - boundaryReachedTime;
                
                // Block grid scroll until delay expires
                if (timeSinceBoundary < BOUNDARY_DELAY) {
                    e.stopPropagation();
                }
                // After delay expires, allow grid scroll (don't stop propagation)
            } else {
                // Cell can still scroll - always stop propagation to grid
                e.stopPropagation();
                // Reset boundary timer since we're scrolling within the cell
                boundaryReachedTime = 0;
            }
        };

        // Use capture phase to intercept before RevoGrid's handlers
        gridElement.addEventListener('wheel', handleCellWheel, { capture: true, passive: false });

        return () => {
            gridElement.removeEventListener('wheel', handleCellWheel, { capture: true });
        };
    }, []);

    // Enhanced column definitions that preserve user-resized widths
    const enhancedColumnDefs = useMemo(() => {
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
        if (DBG) console.log('[DataGrid] translateRangeCoordinates input:', range);
        
        // If no colType or coordinates, return as-is (may be already translated)
        if (!range || !range.colType || (range.x === undefined && range.y === undefined)) {
            if (DBG) console.log('[DataGrid] No colType or coordinates, returning range as-is');
            return range;
        }
        
        const flatCols = getFlatColumns();
    if (DBG) console.log('[DataGrid] flatCols:', flatCols.map(c => ({ prop: c.prop, pin: c.pin })));
        
        let offset = 0;
        const colTypeOrder = ['colPinStart', 'rgCol', 'colPinEnd'];
        const currentTypeIndex = colTypeOrder.indexOf(range.colType);
        
    if (DBG) console.log('[DataGrid] colType:', range.colType, 'currentTypeIndex:', currentTypeIndex);
        
        // If colType not found in order, return as-is
        if (currentTypeIndex < 0) {
            if (DBG) console.log('[DataGrid] colType not in standard order, returning as-is');
            return range;
        }
        
        // Count columns before current type
        for (let i = 0; i < currentTypeIndex; i++) {
            const colType = colTypeOrder[i];
            const colsOfType = flatCols.filter(col => 
                colType === 'rgCol' ? !col.pin : col.pin === colType
            );
            if (DBG) console.log('[DataGrid] colType', colType, 'has', colsOfType.length, 'columns');
            offset += colsOfType.length;
        }
        
        const translated = {
            ...range,
            x: range.x + offset,
            x1: range.x1 + offset
        };
        
        if (DBG) console.log('[DataGrid] Translated coordinates:', {
            original: { x: range.x, x1: range.x1 },
            offset,
            translated: { x: translated.x, x1: translated.x1 }
        });
        
        return translated;
    }, [getFlatColumns, DBG]);

    // Force re-render when columns change by using state instead of just ref
    const [appliedColumns, setAppliedColumns] = useState(enhancedColumnDefs);
    
    // Keep a ref for internal logic that needs column definitions
    const stableColumnDefs = useRef(enhancedColumnDefs);
    const lastEnhancedColumnsRef = useRef(enhancedColumnDefs);
    const lastEmittedMappingsSignatureRef = useRef('');

    useEffect(() => {
        // Only update if the columns actually changed (deep comparison of structure and sizes)
        const columnsChanged = enhancedColumnDefs.length !== lastEnhancedColumnsRef.current.length ||
            enhancedColumnDefs.some((col, index) => {
                const lastCol = lastEnhancedColumnsRef.current[index];
                return !lastCol || col.prop !== lastCol.prop || col.size !== lastCol.size || col.name !== lastCol.name;
            });

        if (columnsChanged) {
            // Merge in any user-saved sizes from the synchronous ref so we don't
            // overwrite a user's recent resize when columns are recalculated.
            const sizesMap = columnSizesRef.current || new Map();
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

    const getMappingsSignature = useCallback((mappingsList) => {
        return JSON.stringify(
            (Array.isArray(mappingsList) ? mappingsList : [])
                .map((mapping) => ({
                    row: String(mapping?.[fields.mappingRowId] ?? ''),
                    col: String(mapping?.[fields.mappingColumnId] ?? ''),
                    value: JSON.stringify(mapping?.[fields.mappingValue] ?? '')
                }))
                .sort((a, b) => {
                    if (a.row !== b.row) return a.row.localeCompare(b.row);
                    if (a.col !== b.col) return a.col.localeCompare(b.col);
                    return a.value.localeCompare(b.value);
                })
        );
    }, [fields.mappingRowId, fields.mappingColumnId, fields.mappingValue]);

    // Notify parent of data changes.
    // Guard with semantic signature to avoid feedback loops when parent re-renders
    // and passes a new callback identity while mappings content is unchanged.
    useEffect(() => {
        if (!onDataChange) return;
        const signature = getMappingsSignature(currentMappings);
        if (signature === lastEmittedMappingsSignatureRef.current) {
            return;
        }
        lastEmittedMappingsSignatureRef.current = signature;
        onDataChange(currentMappings);
    }, [currentMappings, onDataChange, getMappingsSignature]);

    const clearEditSession = useCallback(() => {
        editSessionRef.current = null;
    }, []);

    const getEditableElementCurrentValue = useCallback((element) => {
        if (!element) return undefined;
        if (typeof element.value !== 'undefined') {
            return normalizeCellValue(element.value);
        }
        if (element.isContentEditable === true) {
            return normalizeCellValue(element.textContent ?? '');
        }
        const contentEditableAncestor = element.closest?.('[contenteditable=""], [contenteditable="true"], [contenteditable]');
        if (contentEditableAncestor) {
            return normalizeCellValue(contentEditableAncestor.textContent ?? '');
        }
        return undefined;
    }, [normalizeCellValue]);

    const isTextUndoCapableEditor = useCallback((element) => {
        if (!element) return false;

        if (element.tagName === 'TEXTAREA') return true;

        if (element.tagName === 'INPUT') {
            const inputType = String(element.getAttribute('type') || 'text').toLowerCase();
            return [
                'text',
                'search',
                'url',
                'tel',
                'email',
                'password',
                'number'
            ].includes(inputType);
        }

        if (element.isContentEditable === true) return true;
        return Boolean(element.closest?.('[contenteditable]'));
    }, []);

    // Handle cell editing
    const handleBeforeEdit = useCallback((event) => {
        const detail = event.detail;
        let columnProp = detail.prop || detail.model?.prop || detail.column?.prop;

        if (!columnProp && detail.rgCol !== undefined) {
            const column = stableColumnDefs.current?.[detail.rgCol];
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

        const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;
        const row = getRowByIndex(rowIndex);
        const initialRawValue = resolveEditValue(detail, columnProp) ?? row?.[columnProp] ?? '';

        editSessionRef.current = {
            rowIndex,
            columnProp,
            initialValue: normalizeCellValue(initialRawValue)
        };
    }, [
        isStandaloneGrid,
        staticColumns,
        isEditableColumn,
        getRowByIndex,
        resolveEditValue,
        normalizeCellValue
    ]);

    const handleAfterEdit = useCallback((event) => {
        const detail = event.detail;
        if (DBG) console.log('[DataGrid] handleAfterEdit event detail:', detail);

        // Handle range edits
        if (detail.newRange || detail.oldRange) {
            if (DBG) console.log('[DataGrid] Processing range edit:', {
                newRange: detail.newRange,
                oldRange: detail.oldRange,
                data: detail.data
            });
            
            const { data, newRange } = detail;

            if (!data || !newRange) {
                if (DBG) console.log('[DataGrid] Missing data or newRange, aborting');
                clearEditSession();
                return;
            }

            const updates = [];
            const rowDataUpdates = []; // For standalone grids

            // CRITICAL: Do NOT use translated coordinates to iterate!
            // RevoGrid's data object already has correct column props as keys.
            // Using translated coordinates with flattened columns array causes misalignment
            // because RevoGrid's coordinate system doesn't account for child columns in the same way.
            
            if (DBG) console.log('[DataGrid] Processing range edit data directly by keys');

            // Iterate through data by rowIndex, then by columnProp
            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);
                
                if (!row) {
                    if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }

                // Iterate through all column props in this row's data
                for (const [columnProp, newValue] of Object.entries(rowDataObj)) {
                    if (newValue === undefined || newValue === null) continue;

                    const isStaticColumn = staticColumns.some(col => col.prop === columnProp);
                    const staticColumn = staticColumns.find(col => col.prop === columnProp);
                    const isEditable = isEditableColumn(columnProp);

                    if (DBG) console.log(`[DataGrid] Range edit - column: ${columnProp}, isStatic: ${isStaticColumn}, isEditable: ${isEditable}, readonly: ${staticColumn?.readonly}`);

                    // Skip readonly columns
                    if (staticColumn?.readonly) {
                        if (DBG) console.log(`[DataGrid] Skipping ${columnProp} - readonly`);
                        continue;
                    }

                    // Skip non-editable columns (must be either static OR editable)
                    if (!isEditable && !isStaticColumn) {
                        if (DBG) console.log(`[DataGrid] Skipping ${columnProp} - not editable and not static`);
                        continue;
                    }

                    const stringValue = normalizeCellValue(newValue);

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

            commitGridChanges({
                rowDataUpdates,
                mappingUpdates: updates,
                reason: 'range-edit'
            });
            clearEditSession();
            return;
        }

    // Handle single cell edit
    if (DBG) console.log('[DataGrid] Processing single cell edit');
        const columnProp = detail.prop || detail.model?.prop || detail.column?.prop;
        let newValue = resolveEditValue(detail, columnProp);
        const rowIndex = detail.rowIndex ?? detail.rgRow ?? detail.model?.y ?? detail.y;

        if (DBG) console.log('[DataGrid] Single cell edit details:', {
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
            if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
            clearEditSession();
            return;
        }

        const stringValue = normalizeCellValue(newValue);

        // Check if this is a static column (row data) edit or a dynamic column (mapping) edit
        const isStaticColumn = staticColumns.some(col => col.prop === columnProp);

        if (isStaticColumn) {
            commitGridChanges({
                rowDataUpdates: [{
                    rowId: row[fields.rowId],
                    columnProp,
                    value: stringValue
                }],
                reason: 'row-cell-edit'
            });
        } else if (isEditableColumn(columnProp)) {
            commitGridChanges({
                mappingUpdates: [{
                    rowId: row[fields.rowId],
                    columnId: columnProp,
                    value: stringValue
                }],
                reason: 'mapping-cell-edit'
            });
        }
        clearEditSession();
    }, [
        staticColumns,
        isStandaloneGrid,
        isEditableColumn,
        getRowByIndex,
        fields,
        normalizeCellValue,
        commitGridChanges,
        resolveEditValue,
        clearEditSession,
        DBG
    ]);

    const handleBeforeRangeEdit = useCallback((event) => {
        const detail = event.detail;
        if (DBG) console.log('[DataGrid] handleBeforeRangeEdit event detail:', detail);
        
        // IMPORTANT: Don't use coordinate translation here!
        // RevoGrid will provide the actual data with column props as keys in afterrangeedit
        // We just need to check if ANY of the columns in the range are editable
        // If we prevent here incorrectly, the edit won't reach afterrangeedit where we have the data
        
        // For now, allow all range edits through and let handleAfterEdit filter by column
        // This is safer than using broken coordinate translation
        
        // NOTE: If we need stricter validation, we should:
        // 1. Wait for RevoGrid to provide column information in the event
        // 2. Or check which columns are actually present in detail.data (if available)
        // 3. Never use coordinate translation with grouped columns
        
    }, [DBG]);

    const handleAfterRangeEdit = useCallback((event) => {
        // Range edits are handled in handleAfterEdit
        handleAfterEdit(event);
    }, [handleAfterEdit]);

    // Handle keyboard shortcuts
    const handleClearCell = useCallback(async () => {
        if (DBG) console.log('[DataGrid] handleClearCell called');
        const gridElement = gridRef.current;
        if (!gridElement) {
            if (DBG) console.log('[DataGrid] No grid element found');
            return false;
        }

        try {
            // Use the grid's getSelectedRange API instead of DOM parsing
            if (typeof gridElement.getSelectedRange === 'function') {
                const selectedRange = await gridElement.getSelectedRange();
                if (DBG) console.log('[DataGrid] Selected range for clear:', selectedRange);
                
                if (selectedRange) {
                    // Translate coordinates if we have colType
                    const translatedRange = translateRangeCoordinates(selectedRange);
                    if (DBG) console.log('[DataGrid] Translated range for clear:', translatedRange);
                    
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

                    return commitGridChanges({
                        rowDataUpdates,
                        mappingUpdates: updates,
                        reason: 'clear-region'
                    });
                }
            }

            // Fallback to old DOM-based method if getSelectedRange is not available
                const focusedCell = gridElement.querySelector('[data-rgrow][data-rgcol].focused') ||
                gridElement.querySelector('[data-rgrow][data-rgcol][tabindex="0"]') ||
                gridElement.querySelector('[data-rgrow][data-rgcol].selected');

            if (focusedCell) {
                const rgRow = parseInt(focusedCell.getAttribute('data-rgrow') || '0', 10);
                const rgCol = parseInt(focusedCell.getAttribute('data-rgcol') || '0', 10);
                
                if (DBG) console.log('[DataGrid] Found focused cell (fallback):', { rgRow, rgCol });

                const flatColumnDefs = getFlatColumns();
                const column = flatColumnDefs[rgCol];
                if (!column) return false;

                const row = getRowByIndex(rgRow);
                if (!row) return false;

                const isStaticColumn = staticColumns.some(col => col.prop === column.prop);

                if (isStaticColumn) {
                    return commitGridChanges({
                        rowDataUpdates: [{
                            rowId: row[fields.rowId],
                            columnProp: column.prop,
                            value: ''
                        }],
                        reason: 'clear-cell'
                    });
                } else if (!isStandaloneGrid && isEditableColumn(column.prop)) {
                    return commitGridChanges({
                        mappingUpdates: [{
                            rowId: row[fields.rowId],
                            columnId: column.prop,
                            value: ''
                        }],
                        reason: 'clear-cell'
                    });
                }
            }
        } catch (error) {
            if (DBG) console.error('Error clearing cell:', error);
        }

        return false;
    }, [gridRef, translateRangeCoordinates, getFlatColumns, getRowByIndex, staticColumns, isStandaloneGrid, isEditableColumn, fields, commitGridChanges, DBG]);

    const isEditableInputElement = useCallback((element) => {
        if (!element) return false;
        return (
            element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable === true ||
            element.closest?.('[contenteditable]') ||
            element.hasAttribute?.('contenteditable')
        );
    }, []);

    const isEventFromThisGrid = useCallback((event) => {
        const gridElement = gridRef.current;
        if (!gridElement) return false;

        if (typeof event.composedPath === 'function') {
            const path = event.composedPath();
            if (Array.isArray(path) && path.includes(gridElement)) {
                return true;
            }
        }

        const target = event.target;
        return target instanceof Node ? gridElement.contains(target) : false;
    }, []);

    const isGridCurrentlyFocused = useCallback(() => {
        const gridElement = gridRef.current;
        if (!gridElement) return false;

        const activeElement = document.activeElement;
        if (activeElement && gridElement.contains(activeElement)) {
            return true;
        }

        return Boolean(
            gridElement.querySelector(
                '[data-rgrow][data-rgcol].focused, [data-rgrow][data-rgcol].selected, [data-rgrow][data-rgcol][tabindex="0"]'
            )
        );
    }, []);

    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (event) => {
            if (!isEventFromThisGrid(event) && !isGridCurrentlyFocused()) {
                return;
            }

            const activeElement = document.activeElement;
            const isEditingCell = isEditableInputElement(activeElement);

            const hasModifier = event.ctrlKey || event.metaKey;
            const key = String(event.key || '').toLowerCase();
            const isUndo = hasModifier && key === 'z' && !event.shiftKey;
            const isRedo = hasModifier && (key === 'y' || (key === 'z' && event.shiftKey));
            const isDelete = event.key === 'Delete' || event.key === 'Backspace';
            const isEscape = event.key === 'Escape';

            if (event.repeat && (isUndo || isRedo)) {
                // Prevent key-repeat from falling through to RevoGrid handlers.
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return;
            }

            if (isEscape) {
                clearEditSession();
                return;
            }

            if (isUndo || isRedo) {
                if (isEditingCell) {
                    const initialValue = editSessionRef.current?.initialValue;
                    const currentValue = getEditableElementCurrentValue(activeElement);
                    const canUseNativeUndo = isTextUndoCapableEditor(activeElement);
                    const hasEditorChanges = (
                        currentValue !== undefined &&
                        initialValue !== undefined &&
                        currentValue !== initialValue
                    );

                    // Let native input/contenteditable undo/redo run first while user is actively editing text.
                    if (canUseNativeUndo && hasEditorChanges) {
                        return;
                    }
                }

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                clearEditSession();
                if (isUndo) {
                    undo();
                } else {
                    redo();
                }
                return;
            }

            if (isDelete && !isEditingCell) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                void handleClearCell();
                return;
            }

            if (isEditingCell) return;
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [
        isActive,
        handleClearCell,
        undo,
        redo,
        isEventFromThisGrid,
        isGridCurrentlyFocused,
        isEditableInputElement,
        getEditableElementCurrentValue,
        clearEditSession,
        isTextUndoCapableEditor
    ]);

    useEffect(() => {
        if (!isActive) return;

        const handleFocusOut = (event) => {
            if (!editSessionRef.current) return;
            const gridElement = gridRef.current;
            if (!gridElement) {
                clearEditSession();
                return;
            }

            const target = event.target;
            if (!(target instanceof Node) || !gridElement.contains(target)) return;

            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && gridElement.contains(nextTarget)) return;

            clearEditSession();
        };

        document.addEventListener('focusout', handleFocusOut, true);
        return () => document.removeEventListener('focusout', handleFocusOut, true);
    }, [isActive, clearEditSession]);

    // Handle paste region event - let RevoGrid handle the paste operation internally
    // We intercept the clipboardrangepaste event which provides proper coordinate information
    const handlePasteRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handlePasteRegion - letting RevoGrid handle paste internally:', event.detail);
        // RevoGrid's clipboard system will trigger the clipboardrangepaste event with proper coordinates
        // We don't need to manually handle paste here, just let it flow through RevoGrid's system
    }, [DBG]);

    // Handle clipboard range paste event - this is the proper RevoGrid paste event with coordinate information
    const handleClipboardRangePaste = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClipboardRangePaste:', event.detail);
        
        const { data, range } = event.detail;
        if (!data || !range) {
            if (DBG) console.log('[DataGrid] No valid clipboard paste data');
            return;
        }
        
        try {
            // RevoGrid's data object already uses column props as keys (not colType-relative indexes)
            // so we don't need coordinate translation for the data processing
            // The range coordinates are for display/validation purposes
            const updates = [];
            const rowDataUpdates = [];
            
            if (DBG) console.log('[DataGrid] Processing clipboard data:', { 
                dataKeys: Object.keys(data),
                sampleRow: data[Object.keys(data)[0]]
            });
            
            // Process the data lookup structure from RevoGrid's clipboard system
            // data format: { rowIndex: { columnProp: value } }
            for (const [rowIndexStr, rowDataObj] of Object.entries(data)) {
                const rowIndex = parseInt(rowIndexStr, 10);
                const row = getRowByIndex(rowIndex);
                if (!row) {
                    if (DBG) console.log('[DataGrid] Row not found for index:', rowIndex);
                    continue;
                }
                
                // Iterate through all column props in this row's data
                for (const [columnProp, value] of Object.entries(rowDataObj)) {
                    const stringValue = normalizeCellValue(value);
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
            
            commitGridChanges({
                rowDataUpdates,
                mappingUpdates: updates,
                reason: 'clipboard-paste'
            });
            
            if (DBG) console.log('[DataGrid] Clipboard paste operation completed:', {
                processedRows: Object.keys(data).length,
                rowUpdates: rowDataUpdates.length,
                mappingUpdates: updates.length
            });
            
        } catch (error) {
            if (DBG) console.error('[DataGrid] Error in clipboard paste operation:', error);
        }
    }, [staticColumns, isEditableColumn, getRowByIndex, fields, normalizeCellValue, commitGridChanges, DBG]);

    // Handle clear region event - let the existing handleClearCell handle the logic
    const handleClearRegion = useCallback((event) => {
        if (DBG) console.log('[DataGrid] handleClearRegion - delegating to handleClearCell:', event.detail);
        // RevoGrid's clear region works by calling clearCell on selected ranges
        // Our existing handleClearCell already handles this with proper coordinate translation
        handleClearCell(event);
    }, [handleClearCell, DBG]);

    // Note: We don't handle beforeautofill - it fires BEFORE RevoGrid calculates the data
    // The data processing happens in handleAfterEdit which catches range edits from autofill

    // Action plugins (e.g. file-assign) are supported via the `actionPlugins` prop

    // directory assignment removed; no onDirChange handler

    // Render the complete data grid with controls and debug view
    return (
        <div className={`data-grid ${className} flex flex-col`} style={{ height }}>
            {/* Header */}
            <div className="mb-4 flex-shrink-0">
                {title && (
                    <Heading2 className="text-xl font-bold">{title}</Heading2>
                )}
                {/* <p className="text-gray-600">
                    Rows: {stats.totalRows} | Columns: {stats.totalColumns} | Mappings: {stats.totalMappings}
                    {stats.totalRows > 0 && stats.totalColumns > 0 && ` | Coverage: ${stats.coverage}%`}
                </p> */}

                {/* Controls */}
                {showControls && (
                    <div className="flex items-center gap-2 mt-2">
                        <TooltipButton
                            onClick={undo}
                            disabled={!canUndo}
                            className={`px-3 py-1 text-sm rounded ${canUndo
                                ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                                : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                            }`}
                            tooltipText="Undo (Ctrl+Z)"
                        >
                            ↶ Undo
                        </TooltipButton>
                        <TooltipButton
                            onClick={redo}
                            disabled={!canRedo}
                            className={`px-3 py-1 text-sm rounded ${canRedo
                                ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                                : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                            }`}
                            tooltipText="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                        >
                            ↷ Redo
                        </TooltipButton>

                        {/* Custom Actions */}
                        {customActions.length > 0 && (
                            <>
                                <div className="border-l border-gray-300 h-6 mx-2"></div>
                                {customActions.map((action, index) => (
                                    <TooltipButton
                                        key={index}
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        className={action.className || `px-3 py-1 text-sm rounded border ${
                                            action.disabled
                                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                        tooltipText={action.title}
                                    >
                                        {action.label}
                                    </TooltipButton>
                                ))}
                            </>
                        )}

                        {/* Clear-all mappings button; optionally hidden */}
                        {!hideClearAllMappings && (
                            <>
                                <div className="border-l border-gray-300 h-6 mx-2"></div>
                                <TooltipButton
                                    onClick={handleClearAllMappings}
                                    disabled={!(stats && stats.totalMappings > 0)}
                                    className={`px-3 py-1 text-sm rounded border ${stats && stats.totalMappings > 0
                                        ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                    }`}
                                    tooltipText={stats && stats.totalMappings > 0 ? 'Clear all mappings' : 'No mappings to clear'}
                                >
                                    🗑️ Clear all mappings
                                </TooltipButton>
                            </>
                        )}

                        {/* File assign / plugin area - only show separator when something follows */}
                        {(DBG || (actionPlugins && actionPlugins.length > 0)) && (
                            <div className="border-l border-gray-300 h-6 mx-2"></div>
                        )}
                        {/* Debug button for selection */}
                        {DBG && (
                            <TooltipButton
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
                                tooltipText="Debug selection"
                            >
                                🔍 Debug Selection
                            </TooltipButton>
                        )}

                        {/* Render action plugin*/}
                                            {(actionPlugins && actionPlugins.length > 0) && actionPlugins.map((P, idx) => {
                                                const pluginApi = { gridRef, getFlatColumns, hookRowData, fields, updateMappingsBatch, showDebug };
                                                // If item is a valid React element, clone it with props
                                                if (isValidElement(P)) {
                                                    return cloneElement(P, { key: `plugin-${idx}`, api: pluginApi });
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
            <div className="flex-1 min-h-0">
                <RevoGrid
                    key={gridKey}
                    ref={setGridRef}
                    style={{ height: '100%' }}                
                    source={gridData}
                    rowSize={rowsize}
                columns={appliedColumns}
                onBeforeedit={handleBeforeEdit}
                onAfteredit={handleAfterEdit}
                onBeforerangeedit={handleBeforeRangeEdit}
                onAfterangeedit={handleAfterRangeEdit}
                // Handle copy/paste/clear/autofill events with coordinate translation
                onBeforecopy={(e) => { if (DBG) console.log('[DataGrid] beforecopy:', e.detail); }}
                onBeforepaste={(e) => {
                    if (DBG) console.log('[DataGrid] beforepaste:', e.detail);
                    // Note: beforepaste doesn't seem to have range info, actual paste is in pasteregion
                }}
                onBeforecut={(e) => { if (DBG) console.log('[DataGrid] beforecut:', e.detail); }}
                onCopyregion={(e) => { if (DBG) console.log('[DataGrid] copyregion:', e.detail); }}
                onPasteregion={(e) => {
                    if (DBG) console.log('[DataGrid] pasteregion:', e.detail);
                    handlePasteRegion(e);
                }}
                onClearregion={(e) => {
                    if (DBG) console.log('[DataGrid] clearregion:', e.detail);
                    handleClearRegion(e);
                }}
                onClipboardrangepaste={(e) => {
                    if (DBG) {
                        const detail = e.detail || {};
                        const sample = detail?.data ? Object.entries(detail.data)[0] : undefined;
                        console.log('[DataGrid] clipboardrangepaste (raw sample):', sample);
                    }
                    handleClipboardRangePaste(e);
                }}
                onBeforeautofill={(e) => {
                    if (DBG) {
                        // Log for debugging - RevoGrid will handle autofill internally
                        // Our handleAfterEdit will catch the resulting range edit
                        console.log('[DataGrid] beforeautofill (letting RevoGrid handle):', e.detail);
                    }
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
            </div>

            {/* Action plugins are responsible for any hidden inputs / DOM they need */}

            {/* Directory picker removed temporarily */}
            {/* debug UI removed to keep component lean — use console.debug for logs */}
        </div>
    );
});

export default DataGrid;
