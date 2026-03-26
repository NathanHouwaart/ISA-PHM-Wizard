import React, { useCallback, forwardRef, useMemo } from 'react';
import { useDataGrid } from '../../hooks/useDataGrid';
import {
    applyRowUpdates,
    applyMappingUpdates,
    filterEffectiveRowUpdates,
    filterEffectiveMappingUpdates
} from './model/gridTransactions';
import useGridEditSession from './hooks/useGridEditSession';
import useGridInputHandlers from './hooks/useGridInputHandlers';
import useGridClipboardHandlers from './hooks/useGridClipboardHandlers';
import useGridClearHandlers from './hooks/useGridClearHandlers';
import useGridLayoutSync from './hooks/useGridLayoutSync';
import useGridMappingsEmitter from './hooks/useGridMappingsEmitter';
import useGridControlsApi from './hooks/useGridControlsApi';
import useGridImperativeApi from './hooks/useGridImperativeApi';
import useGridBulkFillActions from './hooks/useGridBulkFillActions';
import DataGridControls from './components/DataGridControls';
import DataGridViewport from './components/DataGridViewport';
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
    height = '45vh',        // Grid height (total container height, defaults to 45vh to match EntityMappingPanel)
    title = 'Data Grid',    // Grid title
    showControls = true,    // Show undo/redo controls
    showDebug = false,      // Show debug information
    rowsize = 50,           // Row height in pixels
    isActive = true,        // Whether this grid is active (should respond to global undo/redo)
    enableBulkFill = false, // Show row bulk-fill helpers in controls
    historyScopeKey,        // Optional history context key (resets undo/redo when key changes)
    isCellEditable,         // Optional callback to gate editing per row+column
    mappingCellProperties,  // Optional callback for dynamic mapping cell styles

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
        mappingCellProperties,
        onRowDataChange, // Pass the callback to the hook
        historyScopeKey
    });

    // Debug flag helper - when false all debug logging in this component is suppressed
    const DBG = !!showDebug;
    const enableClipboardFallback = typeof navigator !== 'undefined'
        && /firefox/i.test(navigator.userAgent || '');

    const resolveEditValue = useCallback((detail, columnProp) => {
        if (!detail) return undefined;
        if (detail.val !== undefined) return detail.val;
        if (columnProp && detail.model && detail.model[columnProp] !== undefined) {
            // Select editors often write directly to model[prop]
            return detail.model[columnProp];
        }
        return detail.value;
    }, []);

    const updateRowDataBatch = useCallback((newRowData, reason = 'row-batch') => {
        applyTransaction({
            nextRowData: newRowData || [],
            nextMappings: currentMappings,
            reason,
            notifyRowData: true
        });
    }, [applyTransaction, currentMappings]);

    const canEditCell = useCallback((row, columnProp) => {
        if (!row || !columnProp) return false;

        const staticColumn = staticColumns.find((col) => col.prop === columnProp);
        const isStaticColumn = Boolean(staticColumn);

        let defaultCanEdit = false;
        if (isStandaloneGrid) {
            defaultCanEdit = isStaticColumn && !staticColumn?.readonly;
        } else if (isStaticColumn) {
            defaultCanEdit = !staticColumn?.readonly;
        } else {
            defaultCanEdit = isEditableColumn(columnProp);
        }

        if (!defaultCanEdit) return false;

        if (typeof isCellEditable === 'function') {
            return Boolean(isCellEditable({
                row,
                columnProp,
                isStaticColumn,
                staticColumn: staticColumn || null
            }));
        }

        return true;
    }, [staticColumns, isStandaloneGrid, isEditableColumn, isCellEditable]);

    const rowLookupById = useMemo(() => {
        const lookup = new Map();
        (hookRowData || []).forEach((row) => {
            const rowId = row?.[fields.rowId];
            if (rowId !== undefined && rowId !== null) {
                lookup.set(String(rowId), row);
            }
        });
        return lookup;
    }, [hookRowData, fields.rowId]);

    const updateMappingsBatch = useCallback((updates, reason = 'mapping-batch') => {
        if (!updates || updates.length === 0) return;
        const filteredUpdates = updates.filter((update) => {
            const row = rowLookupById.get(String(update?.rowId ?? ''));
            return canEditCell(row, update?.columnId);
        });

        if (filteredUpdates.length === 0) return;

        const nextMappings = applyMappingUpdates(currentMappings, filteredUpdates, fields);
        applyTransaction({
            nextRowData: hookRowData,
            nextMappings,
            reason,
            notifyRowData: false
        });
    }, [applyTransaction, currentMappings, hookRowData, fields, rowLookupById, canEditCell]);

    const commitGridChanges = useCallback(({
        rowDataUpdates = [],
        mappingUpdates = [],
        reason = 'grid-edit'
    }) => {
        const effectiveRowDataUpdates = filterEffectiveRowUpdates(
            rowDataUpdates,
            hookRowData,
            fields.rowId
        );
        const effectiveMappingUpdates = filterEffectiveMappingUpdates(
            mappingUpdates,
            currentMappings,
            fields
        );

        if (effectiveRowDataUpdates.length === 0 && effectiveMappingUpdates.length === 0) {
            return false;
        }

        const nextRows = effectiveRowDataUpdates.length > 0
            ? applyRowUpdates(hookRowData, effectiveRowDataUpdates, fields.rowId)
            : hookRowData;

        const nextMappings = effectiveMappingUpdates.length > 0
            ? applyMappingUpdates(currentMappings, effectiveMappingUpdates, fields)
            : currentMappings;

        applyTransaction({
            nextRowData: nextRows,
            nextMappings,
            reason,
            notifyRowData: effectiveRowDataUpdates.length > 0
        });

        return true;
    }, [
        hookRowData,
        currentMappings,
        applyTransaction,
        fields
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

    useGridImperativeApi({
        ref,
        hookRowData,
        updateRowDataBatch
    });

    const {
        gridRef,
        setGridRef,
        gridKey,
        appliedColumns,
        stableColumnDefs,
        getFlatColumns,
        translateRangeCoordinates
    } = useGridLayoutSync({
        columnDefs,
        hookRowData,
        updateRowDataBatch,
        showDebug: DBG
    });

    useGridMappingsEmitter({
        mappings: currentMappings,
        onDataChange,
        fields
    });

    const {
        editSessionRef,
        clearEditSession,
        getEditableElementCurrentValue,
        isTextUndoCapableEditor,
        handleBeforeEdit,
        handleAfterEdit,
        handleBeforeRangeEdit,
        handleAfterRangeEdit
    } = useGridEditSession({
        isStandaloneGrid,
        staticColumns,
        isEditableColumn,
        canEditCell,
        getRowByIndex,
        resolveEditValue,
        stableColumnDefsRef: stableColumnDefs,
        fields,
        commitGridChanges,
        showDebug: DBG
    });

    const { handleClearCell } = useGridClearHandlers({
        showDebug: DBG,
        gridRef,
        translateRangeCoordinates,
        getFlatColumns,
        getRowByIndex,
        staticColumns,
        isStandaloneGrid,
        isEditableColumn,
        canEditCell,
        fields,
        commitGridChanges
    });

    const {
        handlePasteRegion,
        handleClipboardRangePaste,
        handleClearRegion,
        handleClipboardPasteShortcut,
        handleClipboardCopyShortcut
    } = useGridClipboardHandlers({
        showDebug: DBG,
        gridRef,
        translateRangeCoordinates,
        getFlatColumns,
        staticColumns,
        isEditableColumn,
        canEditCell,
        getRowByIndex,
        fields,
        commitGridChanges,
        handleClearCell
    });

    const { handleBeforeKeyDown } = useGridInputHandlers({
        isActive,
        gridRef,
        editSessionRef,
        clearEditSession,
        getEditableElementCurrentValue,
        isTextUndoCapableEditor,
        handleClearCell,
        handleClipboardCopyShortcut,
        handleClipboardPasteShortcut,
        enableClipboardFallback,
        undo,
        redo
    });

    // Note: We don't handle beforeautofill - it fires BEFORE RevoGrid calculates the data
    // The data processing happens in handleAfterEdit which catches range edits from autofill

    // Action plugins (e.g. file-assign) are supported via the `actionPlugins` prop

    // directory assignment removed; no onDirChange handler

    const { handleDebugSelection, pluginApi } = useGridControlsApi({
        gridRef,
        getFlatColumns,
        hookRowData,
        fields,
        updateMappingsBatch,
        showDebug
    });

    const { bulkFillActions } = useGridBulkFillActions({
        showDebug: DBG,
        gridRef,
        translateRangeCoordinates,
        getFlatColumns,
        getRowByIndex,
        staticColumns,
        isStandaloneGrid,
        isEditableColumn,
        canEditCell,
        fields,
        commitGridChanges
    });

    const controlsActions = useMemo(() => {
        if (!enableBulkFill) return customActions;
        return [...customActions, ...bulkFillActions];
    }, [enableBulkFill, customActions, bulkFillActions]);

    // Render the complete data grid with controls and debug view
    return (
        <div className={`data-grid ${className} flex flex-col`} style={{ height }}>
            <DataGridControls
                title={title}
                showControls={showControls}
                canUndo={canUndo}
                canRedo={canRedo}
                undo={undo}
                redo={redo}
                customActions={controlsActions}
                hideClearAllMappings={hideClearAllMappings}
                stats={stats}
                handleClearAllMappings={handleClearAllMappings}
                showDebug={DBG}
                onDebugSelection={handleDebugSelection}
                actionPlugins={actionPlugins}
                pluginApi={pluginApi}
            />

            <DataGridViewport
                gridKey={gridKey}
                setGridRef={setGridRef}
                gridData={gridData}
                rowsize={rowsize}
                appliedColumns={appliedColumns}
                handleBeforeEdit={handleBeforeEdit}
                handleAfterEdit={handleAfterEdit}
                handleBeforeRangeEdit={handleBeforeRangeEdit}
                handleAfterRangeEdit={handleAfterRangeEdit}
                showDebug={DBG}
                handlePasteRegion={handlePasteRegion}
                handleClearRegion={handleClearRegion}
                handleClipboardRangePaste={handleClipboardRangePaste}
                handleBeforeKeyDown={handleBeforeKeyDown}
                plugins={plugins}
                gridProps={gridProps}
            />

            {/* Action plugins are responsible for any hidden inputs / DOM they need */}

            {/* Directory picker removed temporarily */}
            {/* debug UI removed to keep component lean - use console.debug for logs */}
        </div>
    );
});

export default DataGrid;

