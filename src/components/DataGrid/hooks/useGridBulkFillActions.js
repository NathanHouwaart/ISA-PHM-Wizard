import { useCallback, useMemo, useRef } from 'react';
import { captureGridSelection } from '../dataGridHelpers';

function parseFiniteNumber(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
}

export default function useGridBulkFillActions({
    showDebug = false,
    gridRef,
    translateRangeCoordinates,
    getFlatColumns,
    getRowByIndex,
    staticColumns,
    isStandaloneGrid,
    isEditableColumn,
    fields,
    commitGridChanges
}) {
    const DBG = !!showDebug;
    const selectionSnapshotRef = useRef(null);

    const staticColumnMap = useMemo(() => {
        const entries = Array.isArray(staticColumns) ? staticColumns : [];
        return new Map(entries.map((column) => [column.prop, column]));
    }, [staticColumns]);

    const rowsFromRange = useCallback((range) => {
        if (!range) return [];
        const translated = translateRangeCoordinates(range);
        const y0 = typeof translated?.y === 'number' ? translated.y : 0;
        const y1 = typeof translated?.y1 === 'number' ? translated.y1 : y0;
        const from = Math.min(y0, y1);
        const to = Math.max(y0, y1);
        const rows = [];
        for (let y = from; y <= to; y++) rows.push(y);
        return rows;
    }, [translateRangeCoordinates]);

    const snapshotSelectionBeforeClick = useCallback(async (event) => {
        // Keep grid selection intact while clicking external toolbar buttons.
        event?.preventDefault?.();
        try {
            const selectedRange = await captureGridSelection(gridRef?.current);
            if (selectedRange) {
                selectionSnapshotRef.current = selectedRange;
            }
        } catch (error) {
            if (DBG) console.error('[DataGrid] Failed to snapshot selection before bulk-fill click:', error);
        }
    }, [gridRef, DBG]);

    const resolveSelectedRows = useCallback(async () => {
        const gridElement = gridRef.current;
        if (!gridElement) return [];

        try {
            if (typeof gridElement.getSelectedRange === 'function') {
                const selectedRange = await gridElement.getSelectedRange();
                if (selectedRange) {
                    const rows = rowsFromRange(selectedRange);
                    if (rows.length > 0) return rows;
                }
            }

            if (selectionSnapshotRef.current) {
                const rows = rowsFromRange(selectionSnapshotRef.current);
                if (rows.length > 0) return rows;
            }

            const focusedCell = gridElement.querySelector('[data-rgrow][data-rgcol].focused')
                || gridElement.querySelector('[data-rgrow][data-rgcol][tabindex="0"]')
                || gridElement.querySelector('[data-rgrow][data-rgcol].selected');

            if (focusedCell) {
                const rgRow = parseInt(focusedCell.getAttribute('data-rgrow') || '0', 10);
                if (Number.isFinite(rgRow)) return [rgRow];
            }
        } catch (error) {
            if (DBG) console.error('[DataGrid] Failed to resolve selected rows for bulk fill:', error);
        }

        return [];
    }, [gridRef, rowsFromRange, DBG]);

    const editableColumns = useMemo(() => {
        const flatColumns = getFlatColumns();
        if (!Array.isArray(flatColumns)) return [];

        return flatColumns
            .filter((column) => column && typeof column.prop === 'string' && column.prop.length > 0)
            .map((column) => {
                const staticColumn = staticColumnMap.get(column.prop);
                const isStaticColumn = !!staticColumn;
                const isReadonlyStatic = !!staticColumn?.readonly;

                if (isStandaloneGrid) {
                    return {
                        column,
                        isStaticColumn,
                        canEdit: !isReadonlyStatic
                    };
                }

                if (isStaticColumn) {
                    return {
                        column,
                        isStaticColumn,
                        canEdit: !isReadonlyStatic
                    };
                }

                return {
                    column,
                    isStaticColumn: false,
                    canEdit: isEditableColumn(column.prop)
                };
            })
            .filter((entry) => entry.canEdit);
    }, [getFlatColumns, isStandaloneGrid, isEditableColumn, staticColumnMap]);

    const requestFillPlan = useCallback((mode) => {
        if (typeof window === 'undefined') return null;

        if (mode === 'constant') {
            const value = window.prompt('Fill selected row(s) with value:', '');
            if (value === null) return null;
            return {
                mode,
                resolveValue: () => value
            };
        }

        const startRaw = window.prompt(`Start value for ${mode === 'increment' ? 'incrementing' : 'decrementing'} fill:`, '0');
        if (startRaw === null) return null;
        const stepRaw = window.prompt('Step size:', '1');
        if (stepRaw === null) return null;

        const start = parseFiniteNumber(startRaw);
        const step = parseFiniteNumber(stepRaw);

        if (start === null || step === null) {
            window.alert('Start and step must be valid numbers.');
            return null;
        }

        if (mode === 'increment') {
            return {
                mode,
                resolveValue: (index) => start + (step * index)
            };
        }

        return {
            mode,
            resolveValue: (index) => start - (step * index)
        };
    }, []);

    const applyRowFill = useCallback(async (mode) => {
        const selectedRows = await resolveSelectedRows();
        if (!selectedRows.length) {
            if (typeof window !== 'undefined') {
                window.alert('Select a row (or range including rows) first.');
            }
            return;
        }

        if (!editableColumns.length) {
            if (typeof window !== 'undefined') {
                window.alert('No editable columns found in this grid.');
            }
            return;
        }

        const fillPlan = requestFillPlan(mode);
        if (!fillPlan) return;

        const rowDataUpdates = [];
        const mappingUpdates = [];

        selectedRows.forEach((rowIndex) => {
            const row = getRowByIndex(rowIndex);
            if (!row) return;

            const rowId = row?.[fields.rowId];
            if (!rowId) return;

            let sequenceIndex = 0;
            editableColumns.forEach(({ column, isStaticColumn }) => {
                const value = fillPlan.resolveValue(sequenceIndex);
                sequenceIndex += 1;

                if (isStaticColumn) {
                    rowDataUpdates.push({
                        rowId,
                        columnProp: column.prop,
                        value
                    });
                } else {
                    mappingUpdates.push({
                        rowId,
                        columnId: column.prop,
                        value
                    });
                }
            });
        });

        if (rowDataUpdates.length === 0 && mappingUpdates.length === 0) return;

        commitGridChanges({
            rowDataUpdates,
            mappingUpdates,
            reason: `bulk-fill-row-${mode}`
        });

        // Prevent stale selection reuse across unrelated actions.
        selectionSnapshotRef.current = null;
    }, [
        resolveSelectedRows,
        editableColumns,
        requestFillPlan,
        getRowByIndex,
        fields.rowId,
        commitGridChanges
    ]);

    const bulkFillActions = useMemo(() => ([
        {
            label: 'Fill Row',
            title: 'Fill selected row(s) with one value',
            onMouseDown: (event) => {
                void snapshotSelectionBeforeClick(event);
            },
            onClick: () => {
                void applyRowFill('constant');
            }
        },
        {
            label: 'Row +',
            title: 'Fill selected row(s) with incrementing values',
            onMouseDown: (event) => {
                void snapshotSelectionBeforeClick(event);
            },
            onClick: () => {
                void applyRowFill('increment');
            }
        },
        {
            label: 'Row -',
            title: 'Fill selected row(s) with decrementing values',
            onMouseDown: (event) => {
                void snapshotSelectionBeforeClick(event);
            },
            onClick: () => {
                void applyRowFill('decrement');
            }
        }
    ]), [applyRowFill, snapshotSelectionBeforeClick]);

    return {
        bulkFillActions
    };
}
