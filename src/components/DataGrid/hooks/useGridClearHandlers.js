import { useCallback } from 'react';

export default function useGridClearHandlers({
    showDebug = false,
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
}) {
    const DBG = !!showDebug;

    const handleClearCell = useCallback(async () => {
        if (DBG) console.log('[DataGrid] handleClearCell called');
        const gridElement = gridRef.current;
        if (!gridElement) {
            if (DBG) console.log('[DataGrid] No grid element found');
            return false;
        }

        try {
            if (typeof gridElement.getSelectedRange === 'function') {
                const selectedRange = await gridElement.getSelectedRange();
                if (DBG) console.log('[DataGrid] Selected range for clear:', selectedRange);

                if (selectedRange) {
                    const translatedRange = translateRangeCoordinates(selectedRange);
                    if (DBG) console.log('[DataGrid] Translated range for clear:', translatedRange);

                    const flatColumnDefs = getFlatColumns();
                    const updates = [];
                    const rowDataUpdates = [];

                    for (let rowIndex = translatedRange.y; rowIndex <= (translatedRange.y1 || translatedRange.y); rowIndex++) {
                        for (let colIndex = translatedRange.x; colIndex <= (translatedRange.x1 || translatedRange.x); colIndex++) {
                            const column = flatColumnDefs[colIndex];
                            if (!column) continue;

                            const row = getRowByIndex(rowIndex);
                            if (!row) continue;

                            const isStaticColumn = staticColumns.some((col) => col.prop === column.prop);
                            if (!canEditCell(row, column.prop)) continue;

                            if (isStaticColumn) {
                                rowDataUpdates.push({
                                    rowId: row[fields.rowId],
                                    columnProp: column.prop,
                                    value: ''
                                });
                            } else if (!isStandaloneGrid && isEditableColumn(column.prop)) {
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

            const focusedCell = gridElement.querySelector('[data-rgrow][data-rgcol].focused')
                || gridElement.querySelector('[data-rgrow][data-rgcol][tabindex="0"]')
                || gridElement.querySelector('[data-rgrow][data-rgcol].selected');

            if (focusedCell) {
                const rgRow = parseInt(focusedCell.getAttribute('data-rgrow') || '0', 10);
                const rgCol = parseInt(focusedCell.getAttribute('data-rgcol') || '0', 10);

                if (DBG) console.log('[DataGrid] Found focused cell (fallback):', { rgRow, rgCol });

                const flatColumnDefs = getFlatColumns();
                const column = flatColumnDefs[rgCol];
                if (!column) return false;

                const row = getRowByIndex(rgRow);
                if (!row) return false;

                const isStaticColumn = staticColumns.some((col) => col.prop === column.prop);
                if (!canEditCell(row, column.prop)) return false;

                if (isStaticColumn) {
                    return commitGridChanges({
                        rowDataUpdates: [{
                            rowId: row[fields.rowId],
                            columnProp: column.prop,
                            value: ''
                        }],
                        reason: 'clear-cell'
                    });
                }

                if (!isStandaloneGrid && isEditableColumn(column.prop)) {
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
    }, [
        DBG,
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
    ]);

    return {
        handleClearCell
    };
}
